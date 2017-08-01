// @flow

import util          from './util'
import _             from 'underscore'

import EventEmitter  from 'events'
import DeviceManager from './DeviceManager'
import Rx            from 'rx'
import Response      from './response'

import Enum          from 'enum'

import SkyWay        from '../assets/skyway.js'

const STATES = new Enum([
    'INIT',
    'SKYWAY_CONNECTED',
    'MESSAGEHUB_CONNECTED',
    'CONNECTED',
    'WAITING'
])

/**
 * @extends EventEmitter
 *
 */
class SiRuClient extends EventEmitter {
  roomName:    string
  connections: Array<Object>
  topics:      Array<string>
  skyway:      SkyWay
  chunks:      Object
  transactions: Array<Object>
  options:     Object
  myid:        string
  state:       string

  /**
   * constructor
   *
   * @param {string} roomName - The name for PubSub Message Bus.
   * @param {Object} options - Optional arguments for the PubSub Bus.
   * @param {string} options.key - SkyWay API key.
   * @param {string} [options.origin] - The domain bounder for API key. Default is 'https:/localhost'
   */
  constructor(roomName: string, options: Object) {
    super();

    // validate arguments
    try {
      this._checkRoomName(roomName)
      this._checkOptions(options)
    } catch(err) {
      // validation failed
      throw(err)
    }

    // set properties
    this.state = STATES.INIT.key
    this.roomName = roomName;
    this.connections = []
    this.topics = []
    this.skyway = undefined
    this.chunks = {}

    this.transactions = []

    // override this.options
    this.options = Object.assign({}, {
      key: undefined,
      origin: 'https://localhost'
    }, options);

    // start establishing SkyWay connecction, then start connecting message hub
    // when finished, we'll emit 'connect' message.

    this._startSkyWayConnection()
      .then( () => {
        this._setState(STATES.SKYWAY_CONNECTED.key)

        return this._connectMessageHub()
      })
      .then( () => {
        this._setState(STATES.MESSAGEHUB_CONNECTED.key)

        return this._sendUserListRequest()
      }).then((userList) => {
        this._setState(STATES.CONNECTED.key)

        this._setChannelHandlers()
        this._setRoomHandler()
        this._connectToDevices(userList)

        return this._next()
      }).then(() => {
        this._setState(STATES.WAITING.key)
      }).catch(err => {throw err})
  }


  /**
   *
   * @param {string} uuid_path - target-device-uuid + path which begin with '/'.
   * @param {object} options
   * @param {string} options.method - default is `GET`
   * @param {object} options.query  - default is `{}`
   * @param {string} options.body   - default is `null`
   */
  fetch(uuid_path: string, {method, query, body}: {
    method: string, query: Object, body: ?string
  }): Promise<any> {
    return new Promise((resolv, reject) => {
      const arr = uuid_path.split("/")
      if(arr.length < 2) {
        reject(new Error("uuid_path is invalide format"))
        return
      }

      const uuid = arr[0]
      const conn = DeviceManager.getDataChannelConnection(uuid)
      if(!conn) reject(new Error(`no connection found for ${uuid}`))

      if(uuid && conn) {
        const transaction_id = Date.now()
        const path           = "/" + arr.slice(1).join("/")

        method         = method || 'GET'
        query          = query || {}
        body           = body || null

        this.transactions.push({uuid, conn, transaction_id, resolv, reject})

        this._sendRequest({uuid, conn, transaction_id, method, path, query, body})
      }
    })
  }


  /**
   * publish data for topic
   * send formatted message to all connecting peer. And if I am subscribing this topic,
   * fire 'message' event.
   * @param {string} topic
   * @param {string|object} data
   */
  publish(topic: string, data: string|Object): void {
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
  subscribe(topic: string): void {
    this.topics.push(topic)
    this.topics = _.uniq(this.topics)
  }

  /**
   * unsubscribe topic
   * @param {string} topic
   */
  unsubscribe(topic: string): void {
    this.topics = this.topics.filter(_topic => { return topic !== _topic })
  }

  /**
   * request streaming to SSG
   *
   * @param {string} uuid
   */
  requestStreaming(uuid: string): Promise<any>{
    return new Promise((resolv, reject) => {
      const conn = DeviceManager.getDataChannelConnection(uuid)
      const peerid = DeviceManager.getPeerid(uuid)

      if(!peerid) reject(new Error(`cannot get peerid`))
      if(conn) {
        conn.send(`SSG:stream/start,${this.myid}`)
      } else {
        reject(new Error(`cannot get connection`))
      }
    })
  }

  /**
   * request stop streaming to SSG
   *
   * @param {string} uuid
   */
  stopStreaming(uuid: string): Promise<any> {
    return new Promise((resolv, reject) => {
      const conn = DeviceManager.getDataChannelConnection(uuid)
      if(conn) conn.send("SSG:stream/stop")
    })
  }

  /**
   * Start establishing SkyWay connection
   * @private
   */
  _startSkyWayConnection(): Promise<any> {
    return new Promise((resolv, reject) => {
      this.skyway = new SkyWay(this.options)

      // finished establishing SkyWay connection
      this.skyway.on('open', id => {
        this.myid = id;
        DeviceManager.setPeerID(this.myid)

        resolv();
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
  _connectMessageHub(): Promise<any> {
    return new Promise((resolv, reject) => {
      let __resolved = false
      const data = {
        roomName: this.roomName,
        roomType: 'mesh'
      }

      const socket = this.skyway.socket

      const __listener = (mesg) => {
        if(mesg.roomName === this.roomName && mesg.src === this.myid) {
          __resolved = true
          socket.removeListener(util.MESSAGE_TYPES.SERVER.ROOM_USER_JOIN.key, __listener)
          resolv()
        }
      }
      // when user join message received
      socket.on(util.MESSAGE_TYPES.SERVER.ROOM_USER_JOIN.key, __listener);

      // send join room request to SkyWay signaling server
      socket.send(util.MESSAGE_TYPES.CLIENT.ROOM_JOIN.key, data);

      setTimeout(ev => {
        if(!__resolved) reject(new Error(`cannot join message hub: ${this.roomName}`))
      }, util.TIMEOUT)
    })
  }

  /**
   * Create SkyWay P2P connection to specified peer
   *
   * @param {string} targetId - target peer id
   * @private
   */
  _createP2PConnection(targetId: string): void {
    // check whether connection is already existing.
    if( this.connections.filter( conn => conn.remoteId === targetId).length === 1 ) return;

    // start DataChannel connection
    const conn = this.skyway.connect(targetId, {serialization: 'none', reliable: true})
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


      DeviceManager.register(conn)
        .then(device => this.emit('meta', device.profile))
        .catch(err => console.warn(err.message))
    })

    // when data received from peer.
    conn.on('data', data => { this._handleP2PData(data) })

    // when error happened.
    conn.on('error', err => {  })
  }

  /**
   * Handle P2P data
   * If topic is subscribed, fire 'message' event
   * @param {string} data - DataChannel data (it must be JSON string)
   * @private
   */
  _handleP2PData(data: string): void {
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

        if(!transaction_id) throw new Error("transaction_id is not specified")

        if ( !message.chunked ) {
          const text = message.body
          const res = new Response({status, transaction_id, method, text})

          this.transactions
            .filter(obj => obj.transaction_id === transaction_id)
            .forEach(obj => {
              obj.resolv(res)
            })

          // remove processed object
          this.transactions = this.transactions.filter( obj => obj.transaction_id !== transaction_id)
        } else {
          // when message is chunked

          // initialize when it is not exist
          if( !this.chunks[transaction_id] ) {
            this.chunks[transaction_id] = {
              status,
              method,
              len: message.chunk_len,
              chunks:[]
            }
          }

          this.chunks[transaction_id].chunks[message.idx] = message.chunk

          // when all chunks are received, reassemble data and resolv
          if( _.compact(this.chunks[transaction_id].chunks).length === message.chunk_len ) {
            const text = this.chunks[transaction_id].chunks.join("")
            const res = new Response({status, transaction_id, method, text})

            this.transactions
              .filter(obj => obj.transaction_id === transaction_id)
              .forEach(obj => {
                obj.resolv(res)
              })

            // remove processed object
            delete this.chunks[transaction_id]
            this.transactions = this.transactions.filter( obj => obj.transaction_id !== transaction_id)
          }
        }
      }
    } catch(e) {
      console.warn(e, data)
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
  _sendRequest({ uuid, conn, transaction_id, method, path, query, body} : {
    uuid: string,
    conn: Object,
    transaction_id: number,
    method: string,
    path: string,
    query: Object,
    body: ?string|Object
  }): void {
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
   * Clean up P2P connection
   * @param {object} conn - DataConnection object
   * @private
   */
  _cleanupP2P(conn: Object): void {
    conn.close()
    this.connections = this.connections.filter( _conn => {return conn !== _conn})
  }

  /**
   * setup handler for DataChannel and MediaChannel as a callee side
   * @private
   */
  _setChannelHandlers(): void {
    // Handler for DataChannel
    this.skyway.on('connection', conn => {
      this.connections.push(conn)

      // setup handler
      conn.on('data', data => { this._handleP2PData(data) })
      conn.on('error', err => { } )
    })

    // Handler for MediaChannel
    this.skyway.on('call', call => {
      call.answer()
      call.on('stream', stream => {
        const uuid = DeviceManager.getUUID(call.remoteId)
        this.emit('stream', stream, uuid)
      })
    })
  }


  /**
   * setup handler for skyway mesh-room features(for joinRoom)
   * @private
   */
  _setRoomHandler(): void {
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

  }

  /**
   * handle join message
   * @param {object} mesg
   * @private
   */
  _handleRoomJoin(mesg: Object): void {
    if(mesg.src !== this.myid) {
      // when we receive room_join message for other peer, we will make P2P connction.
      this._createP2PConnection(mesg.src)
    }
  }

  /**
   * handle leave message
   * cleanup connection object from connections property
   * @param {object} mesg
   * @private
   */
  _handleRoomLeave(mesg: Object): void {
    // obtain connection object for remove
    const conns = this.connections.filter( _conn => { return mesg.src === _conn.remoteId })
    conns.forEach( conn => { this._cleanupP2P(conn)})
  }

  /**
   * handle room data message
   * @param {object} mesg
   * @private
   */
  _handleRoomData(mesg: Object): void {
    // not sure, what should be done for this message
  }

  /**
   * handle room log
   * @param {string} log
   * @private
   */
  _handleRoomLog(log: string): void {
    // not sure, what should be done for this message
  }

  /**
   * handle room users
   * @param {Array} userList
   * @private
   */
  _connectToDevices(userList: Array<string>): void {
    // currently, room api has a bug that there are duplicated peerids
    // in user list. So, we'll eliminate it
    const _userList = _.uniq(userList)

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
  _sendUserListRequest(): Promise<any> {
    return new Promise((resolv, reject) => {
      let __resolved = false
      const data = {
        roomName: this.roomName,
        type: 'media'
      }
      const __socket = this.skyway.socket
      const __req = util.MESSAGE_TYPES.CLIENT.ROOM_GET_USERS.key
      const __res = util.MESSAGE_TYPES.SERVER.ROOM_USERS.key

      // when user list received
      const __listener = mesg => {
        if(this.roomName === mesg.roomName) {
          __resolved = true
          __socket.removeListener(__res, __listener)
          resolv(mesg.userList)
        }
      }

      __socket.on(__res, __listener)

      __socket.send(__req, data)

      setTimeout(ev => {
        if(!__resolved) reject(new Error("cannot get user_list"))
        __socket.removeListener(__res, __listener)
      }, util.TIMEOUT)
    })
  }

  /**
   * check message name
   * it should be ascii character
   *
   * @param {string} name
   * @private
   */
  _checkRoomName(name: string): void {
    if(!name || typeof(name) !== 'string')
      throw(new Error("'name' must be specified in String"))
    if(!name.match(/^[a-zA-Z0-9-_.=]+$/) )
      throw(new Error("'name' must be set of 'a-zA-Z0-9-_.='"))
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
  _checkOptions(options: Object): void {
    if(!options.key || typeof(options.key) !== 'string')
      throw(new Error("options.key must be specified in String"))
    if(options.domain && typeof(options.domain) !== 'string')
      throw(new Error("options.dommain must be specified in String"))
  }

  /**
   * set state and emit event
   *
   * @param {string} state
   * @private
   */
  _setState(state: string): void {
    console.log(state)
    this.state = state
    this.emit('state:change', this.state)
  }

  /**
   */
  _next(): Promise<any> {
    return new Promise((resolv, reject) => {
      resolv()
    })
  }
}

export default SiRuClient;
