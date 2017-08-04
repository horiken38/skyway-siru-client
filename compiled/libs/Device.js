'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Device = function () {
  // SkyWay call object of this device

  /**
   * @params {string} uuid
   * @params {object} profile
   * @params {object} connection
   * @params {string} peerid
   */
  // SkyWay connection object of this device
  // uuid of this device
  function Device(_ref) {
    var uuid = _ref.uuid,
        profile = _ref.profile,
        connection = _ref.connection,
        peerid = _ref.peerid;

    _classCallCheck(this, Device);

    if (typeof uuid !== 'string') throw new Error('Device: wrong uuid : ' + uuid);
    if ((typeof profile === 'undefined' ? 'undefined' : _typeof(profile)) !== 'object') throw new Error('Device: wrong profile: ' + (typeof profile === 'undefined' ? 'undefined' : _typeof(profile)));
    if ((typeof connection === 'undefined' ? 'undefined' : _typeof(connection)) !== 'object') throw new Error('Device: wrong connection: ' + (typeof connection === 'undefined' ? 'undefined' : _typeof(connection)));
    if (typeof peerid !== 'string') throw new Error('Device: wrong peerid : ' + peerid);

    this.uuid = uuid;
    this.profile = profile;
    this.connection = connection;
    this.peerid = peerid;
    this.callobj = null;
  }

  /**
   * @param {Object} callobj
   */
  // peerid of this device
  // profile data


  _createClass(Device, [{
    key: 'setCallObj',
    value: function setCallObj(callobj) {
      if (callobj !== null && (typeof callobj === 'undefined' ? 'undefined' : _typeof(callobj)) === 'object') {
        this.callobj = callobj;
        return true;
      } else {
        return false;
      }
    }

    /**
     */

  }, {
    key: 'unsetCallObj',
    value: function unsetCallObj() {
      this.callobj = null;
    }
  }]);

  return Device;
}();

exports.default = Device;