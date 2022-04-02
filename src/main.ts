/*
 * Created with @iobroker/create-adapter v2.1.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
import Samsung, { KEYS } from "samsung-tv-control";

class Samsung2022TvAdapter extends utils.Adapter {
	private control: Samsung | undefined;

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: "samsung_2022_tv_adapter",
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
		this.setState("info.connection", false, true);

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		this.log.info("config IP: " + this.config.IP);
		this.log.info("config MAC: " + this.config.MAC);

		const config = {
			debug: false, // Default: false
			ip: this.config.IP,
			mac: this.config.MAC,
			nameApp: "Adapter Remote", // Default: NodeJS
			port: 8002, // Default: 8002
			token: "11255133",
			saveToken: false,
		};

		this.control = new Samsung(config);

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

		// In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
		this.setState("info.connection", true, true);

		// examples for the checkPassword/checkGroup functions
		let result = await this.checkPasswordAsync("admin", "iobroker");
		this.log.info("check user admin pw iobroker: " + result);

		result = await this.checkGroupAsync("admin", "admin");
		this.log.info("check group user admin group admin: " + result);
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private onUnload(callback: () => void): void {
		try {
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
			this.log.info(`state ${id} changed: ${JSON.stringify(state)} (ack = ${state.ack})`);

			const keyName = id.split(".")[3];

			if (this.control == undefined) {
				return;
			}

			const isAviable = this.control.isAvailable().catch(() => {
				this.log.info("TV seems to be offline");
			});

			if (!isAviable) {
				if (keyName == "on") {
					this.control.turnOn();
				} else {
					return;
				}
			}

			this.control
				.isAvailable()
				.then(() => {
					const enumKeyName: KEYS = KEYS[keyName as keyof typeof KEYS];

					if (this.control == undefined) {
						return;
					}

					// Send key to TV
					this.control.sendKey(enumKeyName, function (err, res) {
						if (err) {
							//throw new Error();
						} else {
							console.log(res);
						}
					});

					// Control will keep connection for next messages in 1 minute
					// If you would like to close it immediately, you can use `closeConnection()`
					this.control.closeConnection();
				})
				.catch((e) => console.error(e));
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
