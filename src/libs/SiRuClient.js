const EventEmitter = require('events').EventEmitter
const log4js       = require('log4js')
const DeviceManager = require('./DeviceManager')
const _            = require('underscore')
const Rx           = require('rx')
const util         = require('./util')
const Response     = require('./response')

const SkyWay         = require('skywayjs')

log4js.configure({
  appenders: [
    { type: "console", layout: { type: "basic" } }
  ],
  replaceConsole: true
});

const logger = log4js.getLogger('skPubSub')

/**
 * @extends EventEmitter
 *
 */
class SiRuClient extends EventEmitter {
  /**
   * constructor
   *
   * @param {string} roomName - The name for PubSub Message Bus.
   * @param {Object} options - Optional arguments for the PubSub Bus.
   * @param {string} options.key - SkyWay API key.
   * @param {string} [options.origin] - The domain bounder for API key. Default is 'https:/localhost'
   */
  constructor(roomName, options) {
    super();

    // validate arguments
    if(!this._checkRoomName(roomName)) return;
    if(!this._checkOptions(options)) return;

    // set properties
    this.roomName = roomName;
    this.connections = []
    this.topics = []
    this.skyway = undefined

    this.transactions = []

    // override this.options
    this.options = Object.assign({}, {
      key: undefined,
      origin: 'https://localhost'
    }, options);

    // start establishing SkyWay connecction, then start connecting message hub
    // when finished, we'll emit 'connect' message.
    this._startSkyWayConnection()
      .then( () => this._connectMessageHub() )
      .then( () => { this.emit("connect") })
      .catch(err => {throw err})
  }


  /**
   *
   * @param {string} path - '/' etc.
   * @param {object} options
   * @param {string} options.uuid
   * @param {string} options.method - 'GET' etc.
   * @param {object} options.query
   * @param {string} options.body
   */
  fetch(path, options) {
    return new Promise((resolv, reject) => {
      // fixme - validate
      const uuid = options.uuid

      if(!uuid) reject(new Error("options.uuid does not specified"))

      const conn = DeviceManager.getDataChannelConnection(uuid)
      if(!conn) reject(new Error(`no connection found for ${uuid}`))

      if(uuid && conn) {
        const transaction_id = Date.now()
        const method = options.method || 'GET'

        this.transactions.push({uuid, conn, transaction_id, resolv, reject})

        this.sendRequest(uuid, conn, transaction_id, method, path, options.query, options.body)
      }
    })
  }

  /**
   *
   * @param {string} uuid
   * @param {string} conn
   * @param {string} transaction_id
   * @param {string} method
   * @param {string} path
   * @param {object} query
   * @param {string|object} body
   */
  sendRequest(uuid, conn, transaction_id, method, path, query, body){
    const _data = {
      topic: uuid,
      payload: {
        method,
        path,
        query,
        body,
        transaction_id
      }
    }

    conn.send(JSON.stringify(_data))
  }


  /**
   * publish data for topic
   * send formatted message to all connecting peer. And if I am subscribing this topic,
   * fire 'message' event.
   * @param {string} topic
   * @param {string|object} data
   */
  publish(topic, data) {
    const _data = {
      topic,
      payload: data
    }

    // send serialized message to all connecting peer.
    const _serialized = JSON.stringify(_data)
    this.connections.forEach(conn => {
      conn.send(_serialized)
    })

    // if the topic is subscribed by myself, fire 'message' event
    if (this.topics.indexOf(topic) !== -1) this.emit('message', topic, data)
  }

  /**
   * subscribe to topic
   * @param {string} topic
   */
  subscribe(topic) {
    this.topics.push(topic)
  }

  /**
   * unsubscribe topic
   * @param {string} topic
   */
  unsubscribe(topic) {
    this.topics = this.topics.filter(_topic => { return topic !== _topic })
  }

  /**
   * request streaming to SSG
   *
   * @param {*} uuid
   */
  requestStreaming(uuid){
    const conn = DeviceManager.getDataChannelConnection(uuid)
    const peerid = DeviceManager.getPeerid(uuid)

    if(!conn || !peerid) reject(new Error(`cannot get connection or peerid`))

    conn.send(`SSG:stream/start,${this.myid}`)
  }

  stopStreaming(uuid){
    const conn = DeviceManager.getDataChannelConnection(uuid)
    conn.send("SSG:stream/stop")
  }

  /**
   * Start establishing SkyWay connection
   * @private
   */
  _startSkyWayConnection() {
    return new Promise((resolv, reject) => {
      this.skyway = new SkyWay(this.options)

      // finished establishing SkyWay connection
      this.skyway.on('open', id => {
        this.myid = id;
        DeviceManager.start(this.myid)
        this._setDeviceManagerHandler()
        this._setSkyWayHandler()
        resolv();
      })

      // when P2P connection established as a callee side
      // we'll push connection object to Array and set handler for this P2P
      this.skyway.on('connection', conn => {
        this.connections.push(conn)
        logger.debug(`p2p connection is established as a callee (${conn.remoteId}).`)

        // setup handler
        conn.on('data', data => { this._handleP2PData(data) })
        conn.on('error', err => { } )
      })

      this.skyway.on('call', call => {
        call.answer()
        call.on('stream', stream => {
          const uuid = DeviceManager.getUUID(call.remoteId)
          this.emit('stream', stream, uuid)
        })
      })

      // when error happen
      this.skyway.on('error', err => {
        reject(err)
      })
    })
  }

  /**
   * Connect to Message Hub
   * We use FullMesh API for virtual Messsage Hub
   * @private
   */
  _connectMessageHub() {
    return new Promise((resolv, reject) => {
      const data = {
        roomName: this.roomName,
        roomType: 'mesh'
      }

      // send join room request to SkyWay signaling server
      this.skyway.socket.send(util.MESSAGE_TYPES.CLIENT.ROOM_JOIN.key, data);

      // send join room request to SkyWay signaling server
      this.on('roomJoined', () => {
        logger.debug("receive roomJoined")
        resolv()
      })
    })
  }

  /**
   * Create SkyWay P2P connection
   * @param {string} destination - destination peer id
   * @private
   */
  _createP2PConnection(destination) {
    // check whether connection is already existing.
    if( this.connections.filter( conn => conn.remoteId === destination).length === 1 ) return;

    // start DataChannel connection
    const conn = this.skyway.connect(destination, {serialization: 'none', reliable: true})
    this.connections.push(conn)

    // when connection established.
    conn.on('open', () => {
      // start keepalive timer
      const keepalive_mesg = `SSG:keepalive,${this.myid}`
      conn.send(keepalive_mesg)
      const timer = Rx.Observable.interval(util.KEEPALIVETIMER)
        .subscribe(() => {
          if(conn) conn.send(keepalive_mesg)
          else timer.unsubscribe()
        })


      logger.debug(`p2p connection is established to ${destination}`)
      DeviceManager.register(conn)
    })

    // when data received from peer.
    conn.on('data', data => { this._handleP2PData(data) })

    // when error happened.
    conn.on('error', err => {  })
  }

  /**
   * Handle P2P data
   * If topic is subscribed, fire 'message' event
   * @param {object} data - Data sent by peer
   * @param {string} data.topic - The name of topic
   * @param {string|object} - data.payload - payload data
   * @private
   */
  _handleP2PData(data) {
    try {
      const _data   = JSON.parse(data)
      const topic   = _data.topic
      const message = _data.payload

      if(this.topics.indexOf(topic) !== -1) {
        // message with topic
        this.emit('message', topic, message)
      } else if(DeviceManager.exist(topic)) {
        // when message is request and response type
        const status = message.status
        const transaction_id = message.transaction_id
        const method = message.method
        const text = message.body

        if(!transaction_id) throw new Error("transaction_id is not specified")

        const res = new Response({status, transaction_id, method, text})

        this.transactions
          .filter(obj => obj.transaction_id === transaction_id)
          .forEach(obj => {
            obj.resolv(res)
          })

        // remove processed object
        this.transactions = this.transactions.filter( obj => obj.transaction_id !== transaction_id)
      }
    } catch(e) {
      logger.warn(e, data)
    }
  }

  /**
   * Cloean up P2P connection
   * @param {object} conn - DataConnection object
   * @private
   */
  _cleanupP2P(conn) {
    conn.close()
    this.connections = this.connections.filter( _conn => {return conn !== _conn})
    logger.debug("cleanup completed")
  }

  /**
   * setup handler for skyway (for joinRoom)
   * @private
   */
  _setSkyWayHandler() {
    const socket = this.skyway.socket

    // when user join message received
    socket.on(util.MESSAGE_TYPES.SERVER.ROOM_USER_JOIN.key, mesg => {
      if(this.roomName === mesg.roomName) this._handleRoomJoin(mesg)
    });

    // when user leave message received
    socket.on(util.MESSAGE_TYPES.SERVER.ROOM_USER_LEAVE.key, mesg => {
      if(this.roomName === mesg.roomName) this._handleRoomLeave(mesg)
    });

    // when room data message received
    socket.on(util.MESSAGE_TYPES.SERVER.ROOM_DATA.key, mesg => {
      if(this.roomName === mesg.roomName) this._handleRoomData(mesg)
    });

    // when room log received
    socket.on(util.MESSAGE_TYPES.SERVER.ROOM_LOGS.key, mesg => {
      if(this.roomName === mesg.roomName) this._handleRoomLog(mesg.log)
    });

    // when user list received
    socket.on(util.MESSAGE_TYPES.SERVER.ROOM_USERS.key, mesg => {
      if(this.roomName === mesg.roomName) this._handleRoomUsers(mesg.userList)
    });
  }

  /**
   * set DeviceManager handler
   * @private
   */
  _setDeviceManagerHandler() {
    DeviceManager.on('meta', data => this.emit('meta', data))
  }

  /**
   * handle join message
   * @param {object} mesg
   * @private
   */
  _handleRoomJoin(mesg) {
    logger.debug("_handleRoomJoin", mesg)

    if(mesg.src === this.myid) {
      // if user is me, just fire event
      logger.debug("id is mine")
      this.emit('roomJoined', mesg.roomName)
      this._sendUserListRequest()
    } else {
      // if user is not me, create connection
      this._createP2PConnection(mesg.src)
    }
  }

  /**
   * handle leave message
   * cleanup connection object from connections property
   * @param {object} mesg
   * @private
   */
  _handleRoomLeave(mesg) {
    logger.debug("_handleRoomLeave", mesg)
    // todo: if user is not me, close p2p
    // obtain connection object for remove
    const conns = this.connections.filter( _conn => { return mesg.src === _conn.remoteId })
    conns.forEach( conn => { this._cleanupP2P(conn)})
  }

  /**
   * handle room data message
   * @param {object} mesg
   * @private
   */
  _handleRoomData(mesg) {
    logger.debug("_handleRoomData", mesg)
    // not sure, what should be done for this message
  }

  /**
   * handle room log
   * @param {string} log
   * @private
   */
  _handleRoomLog(log) {
    logger.debug("_handleRoomLog", log)
    // not sure, what should be done for this message
  }

  /**
   * handle room users
   * @param {Array} userList
   * @private
   */
  _handleRoomUsers(userList) {

    // currently, room api has a bug that there are duplicated peerids
    // in user list. So, we'll eliminate it
    const _userList = _.uniq(userList)
    logger.debug("_handleRoomUsers", _userList)

    // this is only called when this id join room.
    // in this case, we will connect to arm base devices
    _userList.filter( id => id.indexOf("SSG_") === 0)
      .forEach( id => {
        this._createP2PConnection(id)
      })
  }

  /**
   * send request to get user list to signaling server
   * @private
   */
  _sendUserListRequest() {
    const data = {
      roomName: this.roomName,
      type: 'media'
    }
    this.skyway.socket.send(util.MESSAGE_TYPES.CLIENT.ROOM_GET_USERS.key, data)
  }

  /**
   * check message name
   * it should be ascii character
   *
   * @param {string} name
   * @private
   */
  _checkRoomName(name) {
    if(!name || typeof(name) !== 'string' || !name.match(/^[a-zA-Z0-9-_.=]+$/) ) return false

    return true
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
  _checkOptions(options) {
    if(!options.key || typeof(options.key) !== 'string') return false
    if(options.domain && typeof(options.domain) !== 'string') return false

    return true;
  }
}

module.exports = SiRuClient;