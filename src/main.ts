/*
 * Created with @iobroker/create-adapter v2.1.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
import Samsung, { KEYS } from "samsung-tv-control";

const STATE_NAME_INFO_CONNECTION = "info.connection";

class Samsung2022TvAdapter extends utils.Adapter {
	private control: Samsung | undefined;

	private refreshTimeout: NodeJS.Timeout | undefined;
	private retryConnectionTimeout: NodeJS.Timeout | undefined;
	private refreshIntervalInMinutes = 1;

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: "samsung",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		// Initialize your adapter here

		// Reset the connection indicator during startup
		this.setState(STATE_NAME_INFO_CONNECTION, false, true);

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		this.log.info("config IP: " + this.config.IP);
		this.log.info("config MAC: " + this.config.MAC);
		this.log.info("config REMOTE_NAME: " + this.config.REMOTE_NAME);
		this.log.debug("config TOKEN: " + this.config.TOKEN);

		const config = {
			debug: false, // Default: false
			ip: this.config.IP,
			mac: this.config.MAC,
			nameApp: this.config.REMOTE_NAME || "Remote Adapter", // Default: NodeJS
			port: 8002, // Default: 8002
			token: this.config.TOKEN,
			saveToken: false,
		};

		this.control = new Samsung(config);

		if (!this.config.TOKEN || this.config.TOKEN === "") {
			this.firstInit();
			return;
		}

		for (const keyName in KEYS) {
			this.createState(
				"Remote",
				"",
				keyName,
				{
					role: "button.press",
					write: true,
					def: false,
					type: "boolean",
					dontDelete: true,
				},
				undefined,
			);
		}

		this.createState(
			"TV",
			"",
			"on",
			{
				role: "switch",
				write: true,
				read: true,
				def: false,
				type: "boolean",
				dontDelete: true,
			},
			undefined,
		);
		this.setState("TV.on", false, true);
		this.subscribeStates("*");

		this.onRefreshTimeout();
	}

	private setupRefreshTimeout(): void {
		this.log.debug("Setting up refresh timeout to " + this.refreshIntervalInMinutes);

		const refreshIntervalInMilliseconds = this.refreshIntervalInMinutes * 60 * 1000;
		this.refreshTimeout = setTimeout(this.onRefreshTimeout.bind(this), refreshIntervalInMilliseconds);
	}

	private async onRefreshTimeout(): Promise<void> {
		this.log.debug(`refreshTimeoutFunc started triggered`);

		await this.control
			?.isAvailable()
			.then(() => {
				this.getState(STATE_NAME_INFO_CONNECTION, (error, state) => {
					this.log.debug("GOT STATE: " + JSON.stringify(state));

					if (!state?.val) {
						this.setState(STATE_NAME_INFO_CONNECTION, true, true);
						this.setState("TV.on", true, true);
					}
				});
			})
			.catch(() => {
				this.setState("TV.on", false, true);
				this.setState(STATE_NAME_INFO_CONNECTION, false, true);
			});

		this.setupRefreshTimeout();
	}

	/**
	 * Is called when adapter is started for the first time. It will start negotiating
	 * the access token for the configured TV.
	 */
	private firstInit(): void {
		this.control
			?.isAvailable()
			.then(() => {
				this.log.debug("Attempting to get a token from tv...");

				this.control?.getToken((token) => {
					this.log.debug("# Response getToken:" + token);

					this.config.TOKEN = token;
					this.updateConfig(this.config);
					return;
				});
				return;
			})
			.catch((error) => {
				this.log.error(
					"Could not find Token, because the TV is not reachable! Check your configuration (IP / MAC!); Retrying... " +
						error,
				);

				// Since the TV is not configured. We have to try again.
				this.retryConnectionTimeout = setTimeout(this.onReady.bind(this), 60 * 1000);
			});
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private onUnload(callback: () => void): void {
		try {
			if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
			if (this.retryConnectionTimeout) clearTimeout(this.retryConnectionTimeout);

			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed state changes
	 */
	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		if (state) {
			// The state was changed
			this.log.debug(`state ${id} changed: ${JSON.stringify(state)} (ack = ${state.ack})`);

			// For now: Ignore changes to the state, that are send from this adapter.
			if (state.from == "system.adapter." + this.namespace) {
				this.log.debug("Ignoring that event, because it is send from this adapter.");
				return;
			}

			const keyName = id.split(".")[3];

			if (!keyName) {
				this.log.warn("No keyname found!");
				return;
			} else {
				this.log.debug(`found keyname: '${keyName}'`);
			}

			if (!this.control) {
				return;
			}

			this.control
				.isAvailable()
				.then((value) => {
					this.log.silly(`TV aviable: '${value}'`);

					// Handle shutdown TV on purpuse
					if (keyName === "on") {
						if (!state.val) {
							this.control?.sendKey(KEYS.KEY_POWER, function () {
								// Executed ;)
							});
						}
					}
				})
				.catch((error) => {
					this.log.silly("TV seems to be offline" + error);
					if (keyName === "on") {
						if (state.val) {
							this.log.info("Sending WOL to wake up the TV.");
							this.control?.turnOn();
						}
					} else {
						this.log.silly("TV is offline, doing nothing.");
					}
				});

			this.control
				.isAvailable()
				.then(() => {
					const enumKeyName: KEYS = KEYS[keyName as keyof typeof KEYS];

					// Send key to TV
					this.control?.sendKey(enumKeyName, function () {
						// Executed ;)
					});

					// Control will keep connection for next messages in 1 minute
					// If you would like to close it immediately, you can use `closeConnection()`
					this.control?.closeConnection();
				})
				.catch((e) => this.log.error(e));
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}
}

if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Samsung2022TvAdapter(options);
} else {
	// otherwise start the instance directly
	(() => new Samsung2022TvAdapter())();
}
