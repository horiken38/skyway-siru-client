'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

/**
 * Device Manager
 *
 *
 */

var _Device = require('./Device');

var _Device2 = _interopRequireDefault(_Device);

var _util = require('./util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PROFILE_GET = 'SSG:profile/get';
var STREAM_START = 'SSG:stream/start';
var STREAM_STOP = 'SSG:stream/stop';
var TIMEOUT = 30000;

var DeviceManager = function () {
  // timeout value waiting for profile from other device

  // store other connecting devices
  function DeviceManager() {
    _classCallCheck(this, DeviceManager);

    this.devices = [];
    this.peerid = "";
    this.timeout = TIMEOUT;
  }

  /**
   * @param {string} peerid - my peerid
   */
  // peerid of this device


  _createClass(DeviceManager, [{
    key: 'setPeerID',
    value: function setPeerID(peerid) {
      if (typeof peerid !== 'string') throw new Error('setPeerID: peerid should be string');

      this.peerid = peerid;
    }

    /**
     * This method 1st send request to get profile for peer.
     * When we receive respond of profile data, beginning from the preamble of 'SSG:',
     * we will register this device.
     *
     * @param {objcect} conn - datachannel connection object
     */

  }, {
    key: 'register',
    value: function register(conn) {
      var _this = this;

      return new Promise(function (resolv, reject) {
        var retFlag = false;

        // listener for profile response
        var registerListener = function registerListener(data) {
          console.log(data);
          if (data.length <= 4) return;
          conn.removeListener('data', registerListener);
          retFlag = true;

          var head = data.slice(0, 4).toString(),
              body = data.slice(4).toString();

          if (head !== "SSG:" || !_util2.default.isJSONString(body)) return;

          _this._register(conn, JSON.parse(body)).then(function (device) {
            resolv(device);
          }).catch(function (err) {
            reject(err);
          });
        };

        // set listener
        conn.on('data', registerListener

        // send profile request
        );conn.send(PROFILE_GET);

        setTimeout(function () {
          if (!retFlag) reject(new Error('register: timeout'));
        }, _this.timeout);
      });
    }

    /**
     * unregister device
     *
     * @param {string} uuid - uuid of target device
     *
     */

  }, {
    key: 'unregister',
    value: function unregister(uuid) {
      var _this2 = this;

      return new Promise(function (resolv, reject) {
        _this2.devices = _this2.devices.filter(function (device) {
          return device.uuid !== uuid;
        });
        resolv();
      });
    }

    /**
     * set call object
     *
     * @param {string} uuid
     * @param {Object} callobj
     */

  }, {
    key: 'setCallObject',
    value: function setCallObject(uuid, callobj) {
      var ret = false;
      this.devices.filter(function (device) {
        return device.uuid === uuid;
      }).forEach(function (device) {
        ret = device.setCallObj(callobj);
      });

      return ret;
    }

    /**
     * unset call object
     *
     * @param {string} uuid
     */

  }, {
    key: 'unsetCallObject',
    value: function unsetCallObject(uuid) {
      var ret = false;

      this.devices.filter(function (device) {
        return device.uuid === uuid;
      }).forEach(function (device) {
        device.unsetCallObj();
        ret = true;
      });

      return ret;
    }

    /**
     * get call object
     *
     * @param {string} uuid
     */

  }, {
    key: 'getCallObject',
    value: function getCallObject(uuid) {
      var ret = null;
      this.devices.filter(function (device) {
        return device.uuid === uuid;
      }).forEach(function (device) {
        ret = device.callobj;
      });

      return ret;
    }

    /**
     *
     * @param {object} conn - connection object
     * @param {object} data - data
     */

  }, {
    key: '_register',
    value: function _register(conn, data) {
      var _this3 = this;

      return new Promise(function (resolv, reject) {
        var uuid = data.body && data.body.uuid,
            peerid = data.body && (data.body.peerid || data.body.ssg_peerid),
            connection = conn,
            profile = data.body;

        try {
          if (data.type === 'response' && data.target === 'profile' && data.method === 'get') {
            var device = new _Device2.default({ uuid: uuid, peerid: peerid, connection: connection, profile: profile });

            // we will avoid duplicationg uuid. previous one will be removed
            _this3.devices = _this3.devices.filter(function (_device) {
              return _device.uuid !== uuid;
            });

            _this3.devices.push(device);
            resolv(device);
          } else {
            reject('_register - does not match. type: ' + data.type + ', target: ' + data.target + ', method: ' + data.method);
          }
        } catch (err) {
          reject(err);
        }
      });
    }

    /**
     *
     * @param {string} uuid
     */

  }, {
    key: 'getDataChannelConnection',
    value: function getDataChannelConnection(uuid) {
      var conn = null;

      this.devices.filter(function (device) {
        return device.uuid === uuid;
      }).forEach(function (device) {
        return conn = device.connection;
      });

      return conn;
    }

    /**
     *
     * @param {string} uuid
     */

  }, {
    key: 'getPeerid',
    value: function getPeerid(uuid) {
      var peerid = null;

      this.devices.filter(function (device) {
        return device.uuid === uuid;
      }).forEach(function (device) {
        return peerid = device.peerid;
      });

      return peerid;
    }

    /**
     *
     * @param {string} peerid
     */

  }, {
    key: 'getUUID',
    value: function getUUID(peerid) {
      var uuid = null;

      this.devices.filter(function (device) {
        return device.peerid === peerid;
      }).forEach(function (device) {
        return uuid = device.uuid;
      });

      return uuid;
    }

    /**
     * @param {string} uuid
     */

  }, {
    key: 'exist',
    value: function exist(uuid) {
      var ret = false;

      this.devices.filter(function (device) {
        return device.uuid === uuid;
      }).forEach(function (device) {
        return ret = true;
      });
      return ret;
    }
  }]);

  return DeviceManager;
}();

exports.default = DeviceManager;