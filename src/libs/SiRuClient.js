// @flow

import _             from 'underscore'
import Rx            from 'rx'
import Enum          from 'enum'

import SkyWay        from '../assets/skyway.js'

import util          from './util'
import DeviceManager from './DeviceManager'
import Response      from './response'

const EventEmitter  = require('events').EventEmitter



const STATES = new Enum([
    'INIT',
    'SKYWAY_CONNECTED',
    'ROOM_JOINED',
    'USER_LIST_OBTAINED',
    'STARTED'
])

/**
 * @extends EventEmitter
 *
 */
class SiRuClient extends EventEmitter {
  roomName:    string
  topics:      Array<string>
  skyway:      SkyWay
  chunks:      Object
  options:     Object
  myid:        string
  state:       string
  deviceManager: Object

  /**
   * constructor
   *
   * @param {string} roomName - The name for PubSub Message Bus.
   * @param {Object} options - option argument of skyway constructor
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
    this.topics = []
    this.skyway = undefined
    this.chunks = {}
    this.deviceManager = new DeviceManager()


    // override this.options
    this.options = Object.assign({}, {
      key: undefined,
      origin: 'https://localhost'
    }, options);

    // start establishing SkyWay connecction, then start connecting message hub
    // when finished, we'll emit 'connect' message.

    this._start()
  }

  /**
   * start processing
   *
   */
  _start(): void {
    this._createSkyWayConnection()
      .then( () => {
        this._setState(STATES.SKYWAY_CONNECTED.key)

        return this._sendRoomJoinRequest()
      })
      .then( () => {
        this._setState(STATES.ROOM_JOINED.key)

        return this._sendUserListRequest()
      }).then((userList) => {
        this._setState(STATES.USER_LIST_OBTAINED.key)

        this._setRoomHandlers()

        this._connectToDevices(userList)
        return this._next()
      }).then(() => {
        this._setState(STATES.STARTED.key)
        this.emit("connect")
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
  fetch(uuid_path: string, options:?Object): Promise<any> {
    return new Promise((resolv, reject) => {
      const arr = uuid_path.split("/")
      if(arr.length < 2) {
        reject(new Error("uuid_path is invalide format"))
        return
      }

      const uuid = arr[0]
      const conn = this.deviceManager.getDataChannelConnection(uuid)
      if(!conn) reject(new Error(`no connection found for ${uuid}`))

      if(uuid && conn) {
        const transaction_id = Date.now()
        const path           = "/" + arr.slice(1).join("/")
        let resolved = false

        const _default = { uuid, conn, transaction_id, path, method: 'GET', query: {}, body: null }

        const requestObj = Object.assign({}, _default, options)


        const __listener =  (id, res) => {
          if(id === transaction_id) {
            this.removeListener('__fetchResponse', __listener)

            resolved = true
            resolv(res)
          }
        }
        this.addListener('__fetchResponse', __listener)

        this._sendRequest(requestObj)

        setTimeout( ev => {
          if(!resolved) {
            console.log('timeout')
            this.removeListener('__fetchResponse', __listener)

            reject(new Error(`fetch timeout for ${transaction_id}`))
          }
        }, util.TIMEOUT)
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
    if(typeof(topic) === 'string' && (typeof(data) === 'string' || typeof(data) === 'object')) {
      const _data = {
        topic,
        payload: data
      }

      // send serialized message to all connecting peer.
      const _serialized = JSON.stringify(_data)
      this.deviceManager.devices.forEach( device => {
        device.connection.send(_serialized)
      })

      // if the topic is subscribed by myself, fire 'message' event
      if (this.topics.indexOf(topic) !== -1) this.emit('message', topic, data)
    } else {
      if( typeof(topic) !== 'string' ) throw new Error("topic should be string")
      if( typeof(data) !== 'string' && typeof(data) !== 'object' ) throw new Error("data should be string or object")
    }
  }

  /**
   * subscribe to topic
   * @param {string} topic
   */
  subscribe(topic: string): void {
    if(typeof(topic) === 'string') {
      this.topics.push(topic)
      this.topics = _.uniq(this.topics)
    } else {
      throw new Error("topic should be string")
    }
  }

  /**
   * unsubscribe topic
   * @param {string} topic
   */
  unsubscribe(topic: string): void {
    if(typeof(topic) === 'string') {
      this.topics = this.topics.filter(_topic => { return topic !== _topic })
    } else {
      throw new Error("topic should be string")
    }
  }

  /**
   * request streaming to SSG
   *
   * @param {string} uuid
   */
  requestStreaming(uuid: string): Promise<any>{
    return new Promise((resolv, reject) => {
      const conn = this.deviceManager.getDataChannelConnection(uuid)

      if(conn) {
        let resolved = false

        const __listener = call => {
          const __uuid = this.deviceManager.getUUID(call.remoteId)

          if(__uuid !== uuid) return

          call.on('stream', stream => {
            resolved = true
            this.deviceManager.setCallObject(uuid, call)
            this.emit('stream', stream, uuid)
            resolv(stream)
          })
          call.on('error', err => {
            this.emit('stream:error', err, uuid)
            this.skyway.removeListener('call', __listener)
            this.deviceManager.unsetCallObject(uuid)

            if(!resolved) {
              resolved = true
              reject(err)
            }
          })
          call.on('close', () => {
            this.emit('stream:closed', uuid)
            this.skyway.removeListener('call', __listener)
            this.deviceManager.unsetCallObject(uuid)

            if(!resolved) {
              // received close event when not received 'stream' event, we consider it as error
              resolved = true
              reject(new Error(`stream closed for ${uuid}`))
            }
          })

          call.answer()
        }
        this.skyway.on('call',  __listener)
        conn.send(`SSG:stream/start,${this.myid}`)

        setTimeout( ev => {
          if(!resolved) {
            this.skyway.removeListener('call', __listener)
            this.deviceManager.unsetCallObject(uuid)
            resolved = true
            reject(new Error('timeout'))
          }
        }, util.TIMEOUT)
      } else {
        reject(new Error(`cannot get connection for ${uuid}`))
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
      const conn = this.deviceManager.getDataChannelConnection(uuid)
      if(!conn) {
        reject(new Error(`stopStreaming - cannot find connection for ${uuid}`))
        return
      }
      conn.send("SSG:stream/stop")

      const call = this.deviceManager.getCallObject(uuid)
      if(!call) {
        reject(new Error(`stopStreaming - cannot find call object for ${uuid}`))
        return
      }


      let resolved = false
      call.on('close', () => {
        resolved = true
        this.deviceManager.unsetCallObject(uuid)
        resolv()
      })
      call.close()

      setTimeout(ev => {
        if(!resolved) {
          this.deviceManager.unsetCallObject(uuid)
          reject(new Error("timeout for stopStreaming"))
        }
      }, util.TIMEOUT)
    })
  }

  /**
   * create SkyWay connection
   * @private
   */
  _createSkyWayConnection(): Promise<any> {
    return new Promise((resolv, reject) => {
      let resolved = false
      this.skyway = new SkyWay(this.options)

      // finished establishing SkyWay connection
      this.skyway.on('open', id => {
        this.myid = id;
        this.deviceManager.setPeerID(this.myid)

        resolv();
      })

      // when error happen
      this.skyway.on('error', err => {
        if(!resolved) {
          resolved = true
          reject(err)
        }
      })

      // start timer
      setTimeout( ev => {
        if(!resolved) {
          reject(new Error("timeout - create skyway connection"))
        }
      }, util.TIMEOUT)
    })
  }

  /**
   * Connect to Message Hub
   * We use FullMesh API for virtual Messsage Hub
   * @private
   */
  _sendRoomJoinRequest(): Promise<any> {
    return new Promise((resolv, reject) => {
      const __REQ      = util.MESSAGE_TYPES.CLIENT.ROOM_JOIN.key
      const __EXPECTED = util.MESSAGE_TYPES.SERVER.ROOM_USER_JOIN.key

      const __data = {
        roomName: this.roomName,
        roomType: 'mesh'
      }

      let __resolved = false
      const __socket = this.skyway.socket

      const __listener = (mesg) => {
        if(mesg.roomName === this.roomName && mesg.src === this.myid) {
          __resolved = true
          __socket.removeListener(__EXPECTED, __listener)
          resolv()
        }
      }
      // when user join message received
      __socket.on(__EXPECTED, __listener);

      // send join room request to SkyWay signaling server
      __socket.send(__REQ, __data);

      setTimeout(ev => {
        if(!__resolved) reject(new Error(`cannot join message hub: ${this.roomName}`))
      }, util.TIMEOUT)
    })
  }

  /**
   * Create SkyWay DataChannel connection to specified peer
   *
   * @param {string} targetId - target peer id
   * @private
   */
  _createDCConnection(targetId: string): Promise<any> {
    return new Promise((resolv, reject) => {
      // check connection is already existing. If exists, we do nothing.
      if( this.deviceManager.getUUID(targetId) ) {
        reject(new Error(`you connection for ${targetId} already exists`))
        return;
      }

      // start DataChannel connection
      const conn = this.skyway.connect(targetId, {serialization: 'none', reliable: true})

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

        conn.on('data', data => {
          this._handleDCData(data.toString())
        })


        this.deviceManager.register(conn)
          .then(device => {
            conn.on('close', () => {
              this.deviceManager.unregister(device.uuid)
              this.emit('datachannel:closed', device.uuid)
              timer.unsubscribe()
            })


            this.emit('meta', device.profile)
            resolv(device.profile)
          })
          .catch(err => reject(err.message))
      })

      // when error happened.
      conn.on('error', err => reject(err))
    })
  }

  /**
   * Handle DataChannel data
   * If topic is subscribed, fire 'message' event
   * @param {string} data - DataChannel data (it must be JSON string)
   * @private
   */
  _handleDCData(data: string): void {
    if(data.indexOf('SSG:') === 0) return // ignore control data
    try {
      const _data   = JSON.parse(data)  // _data = {topic, payload}: {topic:string, payload: object}
      const topic   = _data.topic
      const message = _data.payload

      if(this.topics.indexOf(topic) !== -1) {
        // published message
        // In this case message is arbitrary
        this.emit('message', topic, message)
      } else if(this.deviceManager.exist(topic)) {
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

        const status = message.status
        const transaction_id = message.transaction_id
        const method = message.method

        if(!transaction_id) throw new Error("transaction_id is not specified")

        if ( !message.chunked ) {
          const text = message.body
          const res = new Response({status, transaction_id, method, text})

          this.emit('__fetchResponse', transaction_id, res)
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

            this.emit('__fetchResponse', transaction_id, res)


            // remove processed object
            delete this.chunks[transaction_id]
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
   * setup handler for skyway mesh-room features(for joinRoom)
   * @private
   */
  _setRoomHandlers(): void {
    const __socket = this.skyway.socket

    // when user join message received
    __socket.on(util.MESSAGE_TYPES.SERVER.ROOM_USER_JOIN.key, mesg => {
      if(this.roomName === mesg.roomName) this._handleRoomJoin(mesg)
    });

    // when user leave message received
    __socket.on(util.MESSAGE_TYPES.SERVER.ROOM_USER_LEAVE.key, mesg => {
      if(this.roomName === mesg.roomName) this._handleRoomLeave(mesg)
    });
  }

  /**
   * handle join message
   * @param {object} mesg
   * @private
   */
  _handleRoomJoin(mesg: Object): void {
    if(mesg.src !== this.myid) {
      // when we receive room_join message for other peer, we will make DataChannel connection.
      this._createDCConnection(mesg.src)
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
    const uuid = this.deviceManager.getUUID( mesg.src )
    if(uuid) {
      const connection = this.deviceManager.getDataChannelConnection( uuid )
      if(connection) connection.close()
      this.deviceManager.unregister(uuid)
    }
  }

  /**
   * handle room users
   * @param {Array} userList
   * @private
   */
  _connectToDevices(userList: Array<string>): void {
    // currently, room api has a bug that there are duplicated peerids
    // in user list. So, we'll eliminate it

    // this is only called when this id join room.
    // in this case, we will connect to arm base devices
    _.uniq(userList)
      .filter( id => id.indexOf("SSG_") === 0)
      .forEach( id => this._createDCConnection(id))
  }

  /**
   * send request to get user list to signaling server
   * @private
   */
  _sendUserListRequest(): Promise<any> {
    return new Promise((resolv, reject) => {
      let __resolved = false
      const __data = {
        roomName: this.roomName,
        type: 'media'
      }
      const __socket = this.skyway.socket
      const __REQUEST  = util.MESSAGE_TYPES.CLIENT.ROOM_GET_USERS.key
      const __EXPECTED = util.MESSAGE_TYPES.SERVER.ROOM_USERS.key

      // when user list received
      const __listener = mesg => {
        if(this.roomName === mesg.roomName) {
          __resolved = true
          __socket.removeListener(__EXPECTED, __listener)
          resolv(mesg.userList)
        }
      }

      __socket.on(__EXPECTED, __listener)

      __socket.send(__REQUEST, __data)

      setTimeout(ev => {
        if(!__resolved) reject(new Error("cannot get user_list"))
        __socket.removeListener(__EXPECTED, __listener)
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
