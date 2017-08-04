'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _enum = require('enum');

var _enum2 = _interopRequireDefault(_enum);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var clientMessages = new _enum2.default(['SEND_OFFER', 'SEND_ANSWER', 'SEND_CANDIDATE', 'SEND_LEAVE', 'ROOM_JOIN', 'ROOM_LEAVE', 'ROOM_GET_LOGS', 'ROOM_GET_USERS', 'ROOM_SEND_DATA', 'SFU_GET_OFFER', 'SFU_ANSWER', 'SFU_CANDIDATE', 'PING']);

var serverMessages = new _enum2.default(['OPEN', 'ERROR', 'OFFER', 'ANSWER', 'CANDIDATE', 'LEAVE', 'ROOM_LOGS', 'ROOM_USERS', 'ROOM_DATA', 'ROOM_USER_JOIN', 'ROOM_USER_LEAVE', 'SFU_OFFER']);

var util = {
  KEEPALIVETIMER: 25000,
  TIMEOUT: 5000,
  MESSAGE_TYPES: {
    CLIENT: clientMessages,
    SERVER: serverMessages
  },

  /**
  * check str is JSON string or not
  *
  * @params {string} str
  */
  isJSONString: function isJSONString(str) {
    if (typeof str !== 'string') return false;

    try {
      var tmp = JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }
};

exports.default = util;