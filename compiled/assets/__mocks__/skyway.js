'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events');

var TEST_ID = 'test-id';

var Call = function (_EventEmitter) {
  _inherits(Call, _EventEmitter);

  function Call() {
    _classCallCheck(this, Call);

    var _this = _possibleConstructorReturn(this, (Call.__proto__ || Object.getPrototypeOf(Call)).call(this));

    _this.remoteId = 'SSG_test-other-id';
    return _this;
  }

  _createClass(Call, [{
    key: 'answer',
    value: function answer() {
      this.emit('stream', {});
    }
  }, {
    key: 'close',
    value: function close() {
      this.emit('close');
    }
  }]);

  return Call;
}(EventEmitter);

var Conn = function (_EventEmitter2) {
  _inherits(Conn, _EventEmitter2);

  function Conn(parent) {
    _classCallCheck(this, Conn);

    var _this2 = _possibleConstructorReturn(this, (Conn.__proto__ || Object.getPrototypeOf(Conn)).call(this, parent));

    _this2.parent = parent;
    _this2.preamble = 'SSG:';
    _this2.body = JSON.stringify({
      type: 'response',
      target: 'profile',
      method: 'get',
      body: {
        uuid: 'test-uuid',
        ssg_peerid: 'SSG_test-other-id'
      }
    });
    _this2.data = '';
    _this2.createData();

    setTimeout(function (ev) {
      _this2.emit('open');
    }, 100);

    return _this2;
  }

  _createClass(Conn, [{
    key: 'createData',
    value: function createData() {
      this.data = [this.preamble, this.body].join("");
    }
  }, {
    key: 'send',
    value: function send(str) {
      if (str.indexOf("SSG:") === 0) {
        if (str === 'SSG:profile/get') this.emit('data', Buffer.from(this.data));
        if (str.indexOf('SSG:stream/start') === 0) {
          var call = new Call();
          this.parent.emit('call', call);
        }
        if (str === 'SSG:stream/stop') {/*noop*/}
      } else {
        var req = JSON.parse(str);
        if (req.payload.path.indexOf("/echo/") === 0) {
          var ret = { topic: req.topic,
            payload: {
              status: 200,
              transaction_id: req.payload.transaction_id,
              method: req.payload.method,
              chunked: false,
              body: req.payload.path.slice(6)
            }
          };

          this.emit('data', Buffer.from(JSON.stringify(ret)));
        }
      }
    }
  }]);

  return Conn;
}(EventEmitter);

var Socket = function (_EventEmitter3) {
  _inherits(Socket, _EventEmitter3);

  function Socket() {
    _classCallCheck(this, Socket);

    return _possibleConstructorReturn(this, (Socket.__proto__ || Object.getPrototypeOf(Socket)).call(this));
  }

  _createClass(Socket, [{
    key: 'send',
    value: function send(key, data) {
      switch (key) {
        case 'ROOM_JOIN':
          this.emit('ROOM_USER_JOIN', { src: TEST_ID, roomName: data.roomName });
          break;
        case 'ROOM_GET_USERS':
          this.emit('ROOM_USERS', { roomName: data.roomName, userList: ['SSG_test-other-id'] });
          break;
        default:
          break;
      }
    }
  }]);

  return Socket;
}(EventEmitter);

var SkyWay = function (_EventEmitter4) {
  _inherits(SkyWay, _EventEmitter4);

  function SkyWay() {
    _classCallCheck(this, SkyWay);

    var _this4 = _possibleConstructorReturn(this, (SkyWay.__proto__ || Object.getPrototypeOf(SkyWay)).call(this));

    _this4.socket = new Socket();

    setTimeout(function (ev) {
      _this4.myid = TEST_ID;
      _this4.emit('open', _this4.myid);
    }, 100);
    return _this4;
  }

  _createClass(SkyWay, [{
    key: 'connect',
    value: function connect() {
      var conn = new Conn(this);

      return conn;
    }
  }]);

  return SkyWay;
}(EventEmitter);

exports.default = SkyWay;