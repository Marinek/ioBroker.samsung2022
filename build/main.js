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
class Samsung2022TvAdapter extends utils.Adapter {
  constructor(options = {}) {
    super(__spreadProps(__spreadValues({}, options), {
      name: "samsung_2022_tv_adapter"
    }));
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    this.setState("info.connection", false, true);
    this.log.info("config IP: " + this.config.IP);
    this.log.info("config MAC: " + this.config.MAC);
    const config = {
      debug: false,
      ip: this.config.IP,
      mac: this.config.MAC,
      nameApp: "Adapter Remote",
      port: 8002,
      token: "11255133",
      saveToken: false
    };
    this.control = new import_samsung_tv_control.default(config);
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
    this.setState("info.connection", true, true);
    let result = await this.checkPasswordAsync("admin", "iobroker");
    this.log.info("check user admin pw iobroker: " + result);
    result = await this.checkGroupAsync("admin", "admin");
    this.log.info("check group user admin group admin: " + result);
  }
  onUnload(callback) {
    try {
      callback();
    } catch (e) {
      callback();
    }
  }
  onStateChange(id, state) {
    if (state) {
      this.log.info(`state ${id} changed: ${JSON.stringify(state)} (ack = ${state.ack})`);
      const keyName = id.split(".")[3];
      if (this.control == void 0) {
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
      this.control.isAvailable().then(() => {
        const enumKeyName = import_samsung_tv_control.KEYS[keyName];
        if (this.control == void 0) {
          return;
        }
        this.control.sendKey(enumKeyName, function(err, res) {
          if (err) {
          } else {
            console.log(res);
          }
        });
        this.control.closeConnection();
      }).catch((e) => console.error(e));
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
