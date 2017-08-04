'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _enum = require('enum');

var _enum2 = _interopRequireDefault(_enum);

var _skyway = require('../assets/skyway.js');

var _skyway2 = _interopRequireDefault(_skyway);

var _util = require('./util');

var _util2 = _interopRequireDefault(_util);

var _DeviceManager = require('./DeviceManager');

var _DeviceManager2 = _interopRequireDefault(_DeviceManager);

var _response = require('./response');

var _response2 = _interopRequireDefault(_response);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;

var STATES = new _enum2.default(['INIT', 'SKYWAY_CONNECTED', 'ROOM_JOINED', 'USER_LIST_OBTAINED', 'STARTED']);

/**
 * Client class of SkyWay IoT Room Utility
 *
 * @class
 *
 * @param {string} roomName - The name for PubSub Message Bus.
 * @param {Object} options - option argument of skyway constructor. For more detail, please check https://nttcom.github.io/skyway/en/docs/#JS.
 * @param {string} options.key - SkyWay API key. This is only one mandatory parameter in options.
 * @constructs SiRuClient
 *
 * @extends EventEmitter
 */

var SiRuClient = function (_EventEmitter) {
  _inherits(SiRuClient, _EventEmitter);

  function SiRuClient(roomName, options) {
    _classCallCheck(this, SiRuClient);

    // validate arguments
    var _this = _possibleConstructorReturn(this, (SiRuClient.__proto__ || Object.getPrototypeOf(SiRuClient)).call(this));

    try {
      _this._checkRoomName(roomName);
      _this._checkOptions(options);
    } catch (err) {
      // validation failed
      throw err;
    }

    // set properties
    _this.state = STATES.INIT.key;
    _this.roomName = roomName;
    _this.topics = [];
    _this.skyway = undefined;
    _this.chunks = {};
    _this.deviceManager = new _DeviceManager2.default();

    // override this.options
    _this.options = Object.assign({}, {
      key: undefined,
      origin: 'https://localhost'
    }, options);

    // start establishing SkyWay connecction, then start connecting message hub
    // when finished, we'll emit 'connect' message.

    _this._start();
    return _this;
  }

  /**
   * start processing
   *
   * @private
   *
   */


  _createClass(SiRuClient, [{
    key: '_start',
    value: function _start() {
      var _this2 = this;

      this._createSkyWayConnection().then(function () {
        _this2._setState(STATES.SKYWAY_CONNECTED.key);

        return _this2._sendRoomJoinRequest();
      }).then(function () {
        _this2._setState(STATES.ROOM_JOINED.key);

        return _this2._sendUserListRequest();
      }).then(function (userList) {
        _this2._setState(STATES.USER_LIST_OBTAINED.key);

        _this2._setRoomHandlers();

        _this2._connectToDevices(userList);
        return _this2._next();
      }).then(function () {
        _this2._setState(STATES.STARTED.key);
        _this2.emit("connect");
      }).catch(function (err) {
        throw err;
      });
    }

    /**
     *
     * @param {string} uuid_path - target-device-uuid + path which begin with '/'. (e.g. "target-uuid/echo/hello" )
     * @param {object} options
     * @param {string} options.method - default is `GET`
     * @param {object} options.query  - default is `{}`
     * @param {string} options.body   - default is `null`
     *
     * @returns {Promise.<Response>} Response object
     *
     * @method SiRuClient#fetch
     *
     */

  }, {
    key: 'fetch',
    value: function fetch(uuid_path, options) {
      var _this3 = this;

      return new Promise(function (resolv, reject) {
        var arr = uuid_path.split("/");
        if (arr.length < 2) {
          reject(new Error("uuid_path is invalide format"));
          return;
        }

        var uuid = arr[0];
        var conn = _this3.deviceManager.getDataChannelConnection(uuid);
        if (!conn) reject(new Error('no connection found for ' + uuid));

        if (uuid && conn) {
          var transaction_id = Date.now();
          var path = "/" + arr.slice(1).join("/");
          var resolved = false;

          var _default = { uuid: uuid, conn: conn, transaction_id: transaction_id, path: path, method: 'GET', query: {}, body: null };

          var requestObj = Object.assign({}, _default, options);

          var __listener = function __listener(id, res) {
            if (id === transaction_id) {
              _this3.removeListener('__fetchResponse', __listener);

              resolved = true;
              resolv(res);
            }
          };
          _this3.addListener('__fetchResponse', __listener);

          _this3._sendRequest(requestObj);

          setTimeout(function (ev) {
            if (!resolved) {
              console.log('timeout');
              _this3.removeListener('__fetchResponse', __listener);

              reject(new Error('fetch timeout for ' + transaction_id));
            }
          }, _util2.default.TIMEOUT);
        }
      });
    }

    /**
     * publish message to all connecting peer.
     * when subscribing by myself, fire 'message' event internally as well.
     *
     * @param {string} topic
     * @param {string|object} data
     * @method SiRuClient#publish
     */

  }, {
    key: 'publish',
    value: function publish(topic, data) {
      if (typeof topic === 'string' && (typeof data === 'string' || (typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object')) {
        var _data = {
          topic: topic,
          payload: data

          // send serialized message to all connecting peer.
        };var _serialized = JSON.stringify(_data);
        this.deviceManager.devices.forEach(function (device) {
          device.connection.send(_serialized);
        }

        // if the topic is subscribed by myself, fire 'message' event
        );if (this.topics.indexOf(topic) !== -1) this.emit('message', topic, data);
      } else {
        if (typeof topic !== 'string') throw new Error("topic should be string");
        if (typeof data !== 'string' && (typeof data === 'undefined' ? 'undefined' : _typeof(data)) !== 'object') throw new Error("data should be string or object");
      }
    }

    /**
     * subscribe to topic
     * @param {string} topic
     * @method SiRuClient#subscribe
     */

  }, {
    key: 'subscribe',
    value: function subscribe(topic) {
      if (typeof topic === 'string') {
        this.topics.push(topic);
        this.topics = _underscore2.default.uniq(this.topics);
      } else {
        throw new Error("topic should be string");
      }
    }

    /**
     * unsubscribe topic
     * @param {string} topic
     * @method SiRuClient#unsubscribe
     */

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(topic) {
      if (typeof topic === 'string') {
        this.topics = this.topics.filter(function (_topic) {
          return topic !== _topic;
        });
      } else {
        throw new Error("topic should be string");
      }
    }

    /**
     * request streaming to SSG
     *
     * @param {string} uuid
     * @returns {Promise<Object>} returns stream object
     * @method SiRuClient#requestStreaming
     */

  }, {
    key: 'requestStreaming',
    value: function requestStreaming(uuid) {
      var _this4 = this;

      return new Promise(function (resolv, reject) {
        var conn = _this4.deviceManager.getDataChannelConnection(uuid);

        if (conn) {
          var resolved = false;

          var __listener = function __listener(call) {
            var __uuid = _this4.deviceManager.getUUID(call.remoteId);

            if (__uuid !== uuid) return;

            call.on('stream', function (stream) {
              resolved = true;
              _this4.deviceManager.setCallObject(uuid, call);
              _this4.emit('stream', stream, uuid);
              resolv(stream);
            });
            call.on('error', function (err) {
              _this4.emit('stream:error', err, uuid);
              _this4.skyway.removeListener('call', __listener);
              _this4.deviceManager.unsetCallObject(uuid);

              if (!resolved) {
                resolved = true;
                reject(err);
              }
            });
            call.on('close', function () {
              _this4.emit('stream:closed', uuid);
              _this4.skyway.removeListener('call', __listener);
              _this4.deviceManager.unsetCallObject(uuid);

              if (!resolved) {
                // received close event when not received 'stream' event, we consider it as error
                resolved = true;
                reject(new Error('stream closed for ' + uuid));
              }
            });

            call.answer();
          };
          _this4.skyway.on('call', __listener);
          conn.send('SSG:stream/start,' + _this4.myid);

          setTimeout(function (ev) {
            if (!resolved) {
              _this4.skyway.removeListener('call', __listener);
              _this4.deviceManager.unsetCallObject(uuid);
              resolved = true;
              reject(new Error('timeout'));
            }
          }, _util2.default.TIMEOUT);
        } else {
          reject(new Error('cannot get connection for ' + uuid));
        }
      });
    }

    /**
     * request stop streaming to SSG
     *
     * @param {string} uuid
     * @returns {Promise<void>}
     * @method SiRuClient#stopStreaming
     *
     */

  }, {
    key: 'stopStreaming',
    value: function stopStreaming(uuid) {
      var _this5 = this;

      return new Promise(function (resolv, reject) {
        var conn = _this5.deviceManager.getDataChannelConnection(uuid);
        if (!conn) {
          reject(new Error('stopStreaming - cannot find connection for ' + uuid));
          return;
        }
        conn.send("SSG:stream/stop");

        var call = _this5.deviceManager.getCallObject(uuid);
        if (!call) {
          reject(new Error('stopStreaming - cannot find call object for ' + uuid));
          return;
        }

        var resolved = false;
        call.on('close', function () {
          resolved = true;
          _this5.deviceManager.unsetCallObject(uuid);
          resolv();
        });
        call.close();

        setTimeout(function (ev) {
          if (!resolved) {
            _this5.deviceManager.unsetCallObject(uuid);
            reject(new Error("timeout for stopStreaming"));
          }
        }, _util2.default.TIMEOUT);
      });
    }

    /**
     * create SkyWay connection
     * @private
     */

  }, {
    key: '_createSkyWayConnection',
    value: function _createSkyWayConnection() {
      var _this6 = this;

      return new Promise(function (resolv, reject) {
        var resolved = false;
        _this6.skyway = new _skyway2.default(_this6.options);

        // finished establishing SkyWay connection
        _this6.skyway.on('open', function (id) {
          _this6.myid = id;
          _this6.deviceManager.setPeerID(_this6.myid);

          resolv();
        }

        // when error happen
        );_this6.skyway.on('error', function (err) {
          if (!resolved) {
            resolved = true;
            reject(err);
          }
        }

        // start timer
        );setTimeout(function (ev) {
          if (!resolved) {
            reject(new Error("timeout - create skyway connection"));
          }
        }, _util2.default.TIMEOUT);
      });
    }

    /**
     * Connect to Message Hub
     * We use FullMesh API for virtual Messsage Hub
     * @private
     */

  }, {
    key: '_sendRoomJoinRequest',
    value: function _sendRoomJoinRequest() {
      var _this7 = this;

      return new Promise(function (resolv, reject) {
        var __REQ = _util2.default.MESSAGE_TYPES.CLIENT.ROOM_JOIN.key;
        var __EXPECTED = _util2.default.MESSAGE_TYPES.SERVER.ROOM_USER_JOIN.key;

        var __data = {
          roomName: _this7.roomName,
          roomType: 'mesh'
        };

        var __resolved = false;
        var __socket = _this7.skyway.socket;

        var __listener = function __listener(mesg) {
          if (mesg.roomName === _this7.roomName && mesg.src === _this7.myid) {
            __resolved = true;
            __socket.removeListener(__EXPECTED, __listener);
            resolv();
          }
        };
        // when user join message received
        __socket.on(__EXPECTED, __listener);

        // send join room request to SkyWay signaling server
        __socket.send(__REQ, __data);

        setTimeout(function (ev) {
          if (!__resolved) reject(new Error('cannot join message hub: ' + _this7.roomName));
        }, _util2.default.TIMEOUT);
      });
    }

    /**
     * Create SkyWay DataChannel connection to specified peer
     *
     * @param {string} targetId - target peer id
     * @private
     */

  }, {
    key: '_createDCConnection',
    value: function _createDCConnection(targetId) {
      var _this8 = this;

      return new Promise(function (resolv, reject) {
        // check connection is already existing. If exists, we do nothing.
        if (_this8.deviceManager.getUUID(targetId)) {
          reject(new Error('you connection for ' + targetId + ' already exists'));
          return;
        }

        // start DataChannel connection
        var conn = _this8.skyway.connect(targetId, { serialization: 'none', reliable: true }

        // when connection established.
        );conn.on('open', function () {
          // start keepalive timer
          var keepalive_mesg = 'SSG:keepalive,' + _this8.myid;
          conn.send(keepalive_mesg);
          var timer = _rx2.default.Observable.interval(_util2.default.KEEPALIVETIMER).subscribe(function () {
            if (conn) conn.send(keepalive_mesg);else timer.unsubscribe();
          });

          conn.on('data', function (data) {
            _this8._handleDCData(data.toString());
          });

          _this8.deviceManager.register(conn).then(function (device) {
            _this8.emit('device:connected', device.uuid, device.profile);
            _this8.emit('meta', device.profile);
            conn.on('close', function () {
              _this8.deviceManager.unregister(device.uuid);
              _this8.emit('device:closed', device.uuid);
              timer.unsubscribe();
            });

            resolv(device.profile);
          }).catch(function (err) {
            return reject(err.message);
          });
        }

        // when error happened.
        );conn.on('error', function (err) {
          return reject(err);
        });
      });
    }

    /**
     * Handle DataChannel data
     * If topic is subscribed, fire 'message' event
     * @param {string} data - DataChannel data (it must be JSON string)
     * @private
     */

  }, {
    key: '_handleDCData',
    value: function _handleDCData(data) {
      if (data.indexOf('SSG:') === 0) return; // ignore control data
      try {
        var _data = JSON.parse(data // _data = {topic, payload}: {topic:string, payload: object}
        );var topic = _data.topic;
        var message = _data.payload;

        if (this.topics.indexOf(topic) !== -1) {
          // published message
          // In this case message is arbitrary
          this.emit('message', topic, message);
        } else if (this.deviceManager.exist(topic)) {
          // when message is request and response type
          // In this case, message must be
          // {status, transaction_id, method, chunked, chunk_len, idx, body, chunk}
          // : {status: number,
          //    transaction_id: string,
          //    method: string,
          //    chunked: ?boolean,
          //    chunk_len: ?number,
          //    idx: ?number,
          //    body: string
          //    chunk: string }

          var status = message.status;
          var transaction_id = message.transaction_id;
          var method = message.method;

          if (!transaction_id) throw new Error("transaction_id is not specified");

          if (!message.chunked) {
            var text = message.body;
            var res = new _response2.default({ status: status, transaction_id: transaction_id, method: method, text: text });

            this.emit('__fetchResponse', transaction_id, res);
          } else {
            // when message is chunked

            // initialize when it is not exist
            if (!this.chunks[transaction_id]) {
              this.chunks[transaction_id] = {
                status: status,
                method: method,
                len: message.chunk_len,
                chunks: []
              };
            }

            this.chunks[transaction_id].chunks[message.idx] = message.chunk;

            // when all chunks are received, reassemble data and resolv
            if (_underscore2.default.compact(this.chunks[transaction_id].chunks).length === message.chunk_len) {
              var _text = this.chunks[transaction_id].chunks.join("");
              var _res = new _response2.default({ status: status, transaction_id: transaction_id, method: method, text: _text });

              this.emit('__fetchResponse', transaction_id, _res

              // remove processed object
              );delete this.chunks[transaction_id];
            }
          }
        }
      } catch (e) {
        console.warn(e, data);
      }
    }

    /**
     * @param {string} uuid
     * @param {object} conn
     * @param {number} transaction_id
     * @param {string} method
     * @param {string} path
     * @param {object} query
     * @param {string|object} body
     *
     * @private
     */

  }, {
    key: '_sendRequest',
    value: function _sendRequest(_ref) {
      var uuid = _ref.uuid,
          conn = _ref.conn,
          transaction_id = _ref.transaction_id,
          method = _ref.method,
          path = _ref.path,
          query = _ref.query,
          body = _ref.body;


      var _data = {
        topic: uuid,
        payload: {
          method: method,
          path: path,
          query: query,
          body: body,
          transaction_id: transaction_id
        }
      };

      conn.send(JSON.stringify(_data));
    }

    /**
     * setup handler for skyway mesh-room features(for joinRoom)
     * @private
     */

  }, {
    key: '_setRoomHandlers',
    value: function _setRoomHandlers() {
      var _this9 = this;

      var __socket = this.skyway.socket;

      // when user join message received
      __socket.on(_util2.default.MESSAGE_TYPES.SERVER.ROOM_USER_JOIN.key, function (mesg) {
        if (_this9.roomName === mesg.roomName) _this9._handleRoomJoin(mesg);
      });

      // when user leave message received
      __socket.on(_util2.default.MESSAGE_TYPES.SERVER.ROOM_USER_LEAVE.key, function (mesg) {
        if (_this9.roomName === mesg.roomName) _this9._handleRoomLeave(mesg);
      });
    }

    /**
     * handle join message
     * @param {object} mesg
     * @private
     */

  }, {
    key: '_handleRoomJoin',
    value: function _handleRoomJoin(mesg) {
      if (mesg.src !== this.myid) {
        // when we receive room_join message for other peer, we will make DataChannel connection.
        this._createDCConnection(mesg.src);
      }
    }

    /**
     * handle leave message
     * cleanup connection object from connections property
     * @param {object} mesg
     * @private
     */

  }, {
    key: '_handleRoomLeave',
    value: function _handleRoomLeave(mesg) {
      // obtain connection object for remove
      var uuid = this.deviceManager.getUUID(mesg.src);
      if (uuid) {
        var connection = this.deviceManager.getDataChannelConnection(uuid);
        if (connection) connection.close();
        this.deviceManager.unregister(uuid);
      }
    }

    /**
     * handle room users
     * @param {Array} userList
     * @private
     */

  }, {
    key: '_connectToDevices',
    value: function _connectToDevices(userList) {
      var _this10 = this;

      // currently, room api has a bug that there are duplicated peerids
      // in user list. So, we'll eliminate it

      // this is only called when this id join room.
      // in this case, we will connect to arm base devices
      _underscore2.default.uniq(userList).filter(function (id) {
        return id.indexOf("SSG_") === 0;
      }).forEach(function (id) {
        return _this10._createDCConnection(id);
      });
    }

    /**
     * send request to get user list to signaling server
     * @private
     */

  }, {
    key: '_sendUserListRequest',
    value: function _sendUserListRequest() {
      var _this11 = this;

      return new Promise(function (resolv, reject) {
        var __resolved = false;
        var __data = {
          roomName: _this11.roomName,
          type: 'media'
        };
        var __socket = _this11.skyway.socket;
        var __REQUEST = _util2.default.MESSAGE_TYPES.CLIENT.ROOM_GET_USERS.key;
        var __EXPECTED = _util2.default.MESSAGE_TYPES.SERVER.ROOM_USERS.key;

        // when user list received
        var __listener = function __listener(mesg) {
          if (_this11.roomName === mesg.roomName) {
            __resolved = true;
            __socket.removeListener(__EXPECTED, __listener);
            resolv(mesg.userList);
          }
        };

        __socket.on(__EXPECTED, __listener);

        __socket.send(__REQUEST, __data);

        setTimeout(function (ev) {
          if (!__resolved) reject(new Error("cannot get user_list"));
          __socket.removeListener(__EXPECTED, __listener);
        }, _util2.default.TIMEOUT);
      });
    }

    /**
     * check message name
     * it should be ascii character
     *
     * @param {string} name
     * @private
     */

  }, {
    key: '_checkRoomName',
    value: function _checkRoomName(name) {
      if (!name || typeof name !== 'string') throw new Error("'name' must be specified in String");
      if (!name.match(/^[a-zA-Z0-9-_.=]+$/)) throw new Error("'name' must be set of 'a-zA-Z0-9-_.='");
    }

    /**
     * check options name
     * it should include key property
     *
     * @param {object} options
     * @param {string} options.key
     * @param {string} [options.domain]
     * @private
     */

  }, {
    key: '_checkOptions',
    value: function _checkOptions(options) {
      if (!options.key || typeof options.key !== 'string') throw new Error("options.key must be specified in String");
      if (options.domain && typeof options.domain !== 'string') throw new Error("options.dommain must be specified in String");
    }

    /**
     * set state and emit event
     *
     * @param {string} state
     * @private
     */

  }, {
    key: '_setState',
    value: function _setState(state) {
      this.state = state;
      this.emit('state:change', this.state);
    }

    /**
     */

  }, {
    key: '_next',
    value: function _next() {
      return new Promise(function (resolv, reject) {
        resolv();
      });
    }

    /**
     * When connect to room completed, it will fire
     *
     * @event SiRuClient#connect
     */

    /**
     * When other device connected
     *
     * @event SiRuClient#device:connected
     * @property {string} uuid - uuid of the device
     * @property {object} profile - profile object of the device
     *
     * @example
     * client.on('device:connected', (uuid, profile) => {
     *   console.log(uuid)
     *   // #=> 'sample-uuid'
     *   console.log(profile)
     *   // #=> { description: "...",
     *   //       handle_id: "...",
     *   //       name: "some device",
     *   //       ssg_peerid: "SSG_id",
     *   //       streaming: true,
     *   //       topics: [ ... ],
     *   //       uuid: 'sample-uuid'
     *   //     }
     * })
     */

    /**
     * When other device connected, it will fire 'meta' event as well.
     *
     * @event SiRuClient#meta
     * @property {object} profile
     */

    /**
     * When connection closed to other device, it will fire
     *
     * @event SiRuClient#device:closed
     */

    /**
     * When publish message received, this event will be fired.
     *
     * @event SiRuClient#message
     * @property {string} topic
     * @property {data} data
     *
     * @example
     * client.on('message', (topic, data) => {
     *   console.log(topic, data)
     *   // #=> "metric/cpu 42.2"
     * })
     */

    /**
     * When media stream received from peer
     *
     * @event SiRuClient#stream
     * @property {object} stream - stream object
     * @property {string} uuid - uuid of peer
     *
     * @example
     * client.on('stream', stream => {
     *   video.srcObject = stream
     * })
     */

    /**
     * When error happens while requesting media stream
     *
     * @event SiRuClient#stream:error
     * @property {object} error - Error object
     * @property {string} uuid - uuid of peer
     */

    /**
     * When media stream closed
     *
     * @event SiRuClient#stream:closed
     */

    /**
     * When state changed until connecting room completed, it will fire
     *
     * @event SiRuClient#state:change
     * @property {string} state - state
     */

  }]);

  return SiRuClient;
}(EventEmitter);

exports.default = SiRuClient;