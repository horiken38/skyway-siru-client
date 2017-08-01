'use strict';

import EventEmitter from 'events'

const TEST_ID = 'test-id'

class Socket extends EventEmitter {
  constructor() {
    super()
  }

  send(key, data) {
    switch( key ) {
    case 'ROOM_JOIN':
      this.emit('ROOM_USER_JOIN', { src: TEST_ID, roomName: data.roomName })
      break;
    case 'ROOM_GET_USERS':
      this.emit('ROOM_USERS', { roomName: data.roomName, userList: ['SSG_test-other-id']})
      break;
    default:
      break;
    }
  }
}

class SkyWay extends EventEmitter {
  constructor() {
    super()
    this.socket = new Socket()

    setTimeout( ev => {
      this.myid = TEST_ID
      this.emit('open', this.myid)
    }, 100)
  }
}

export default SkyWay
