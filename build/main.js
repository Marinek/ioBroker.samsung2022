var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_samsung_tv_control = __toESM(require("samsung-tv-control"));
const STATE_NAME_INFO_CONNECTION = "info.connection";
class Samsung2022TvAdapter extends utils.Adapter {
  constructor(options = {}) {
    super(__spreadProps(__spreadValues({}, options), {
      name: "samsung_2022_tv_adapter"
    }));
    this.refreshIntervalInMinutes = 1;
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    this.setState(STATE_NAME_INFO_CONNECTION, false, true);
    this.log.info("config IP: " + this.config.IP);
    this.log.info("config MAC: " + this.config.MAC);
    this.log.info("config REMOTE_NAME: " + this.config.REMOTE_NAME);
    this.log.debug("config TOKEN: " + this.config.TOKEN);
    const config = {
      debug: false,
      ip: this.config.IP,
      mac: this.config.MAC,
      nameApp: this.config.REMOTE_NAME || "Remote Adapter",
      port: 8002,
      token: this.config.TOKEN,
      saveToken: false
    };
    this.control = new import_samsung_tv_control.default(config);
    if (!this.config.TOKEN || this.config.TOKEN === "") {
      this.firstInit();
      return;
    }
    for (const keyName in import_samsung_tv_control.KEYS) {
      this.createState("Remote", "", keyName, {
        role: "button.press",
        write: true,
        def: false,
        type: "boolean",
        dontDelete: true
      }, void 0);
    }
    this.createState("TV", "", "on", {
      role: "switch",
      write: true,
      read: true,
      def: false,
      type: "boolean",
      dontDelete: true
    }, void 0);
    this.setState("TV.on", false, true);
    this.subscribeStates("*");
    this.onRefreshTimeout();
  }
  setupRefreshTimeout() {
    this.log.debug("Setting up refresh timeout to " + this.refreshIntervalInMinutes);
    const refreshIntervalInMilliseconds = this.refreshIntervalInMinutes * 60 * 1e3;
    this.refreshTimeout = setTimeout(this.onRefreshTimeout.bind(this), refreshIntervalInMilliseconds);
  }
  async onRefreshTimeout() {
    var _a;
    this.log.debug(`refreshTimeoutFunc started triggered`);
    await ((_a = this.control) == null ? void 0 : _a.isAvailable().then(() => {
      this.getState(STATE_NAME_INFO_CONNECTION, (error, state) => {
        this.log.debug("GOT STATE: " + JSON.stringify(state));
        if (!(state == null ? void 0 : state.val)) {
          this.setState(STATE_NAME_INFO_CONNECTION, true, true);
          this.setState("TV.on", true, true);
        }
      });
    }).catch(() => {
      this.setState("TV.on", false, true);
      this.setState(STATE_NAME_INFO_CONNECTION, false, true);
    }));
    this.setupRefreshTimeout();
  }
  firstInit() {
    var _a;
    (_a = this.control) == null ? void 0 : _a.isAvailable().then(() => {
      var _a2;
      this.log.debug("Attempting to get a token from tv...");
      (_a2 = this.control) == null ? void 0 : _a2.getToken((token) => {
        this.log.debug("# Response getToken:" + token);
        this.config.TOKEN = token;
        this.updateConfig(this.config);
        return;
      });
      return;
    }).catch((error) => {
      this.log.error("Could not find Token, because the TV is not reachable! Check your configuration (IP / MAC!); Retrying... " + error);
      this.retryConnectionTimeout = setTimeout(this.onReady.bind(this), 60 * 1e3);
    });
  }
  onUnload(callback) {
    try {
      if (this.refreshTimeout)
        clearTimeout(this.refreshTimeout);
      if (this.retryConnectionTimeout)
        clearTimeout(this.retryConnectionTimeout);
      callback();
    } catch (e) {
      callback();
    }
  }
  onStateChange(id, state) {
    if (state) {
      this.log.debug(`state ${id} changed: ${JSON.stringify(state)} (ack = ${state.ack})`);
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
      this.control.isAvailable().then((value) => {
        this.log.silly(`TV aviable: '${value}'`);
      }).catch((error) => {
        this.log.silly("TV seems to be offline" + error);
        if (keyName === "on") {
          if (this.control && state.val) {
            this.log.info("Sending WOL to wake up the TV.");
            this.control.turnOn();
          }
        } else {
          this.log.silly("TV is offline, doing nothing.");
        }
      });
      this.control.isAvailable().then(() => {
        var _a, _b;
        const enumKeyName = import_samsung_tv_control.KEYS[keyName];
        (_a = this.control) == null ? void 0 : _a.sendKey(enumKeyName, function(err, res) {
          if (err) {
          } else {
            console.log(res);
          }
        });
        (_b = this.control) == null ? void 0 : _b.closeConnection();
      }).catch((e) => this.log.error(e));
    } else {
      this.log.info(`state ${id} deleted`);
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new Samsung2022TvAdapter(options);
} else {
  (() => new Samsung2022TvAdapter())();
}
//# sourceMappingURL=main.js.map
