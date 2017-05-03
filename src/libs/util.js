const Enum         = require('enum')

const clientMessages = new Enum([
  'SEND_OFFER',
  'SEND_ANSWER',
  'SEND_CANDIDATE',
  'SEND_LEAVE',
  'ROOM_JOIN',
  'ROOM_LEAVE',
  'ROOM_GET_LOGS',
  'ROOM_GET_USERS',
  'ROOM_SEND_DATA',
  'SFU_GET_OFFER',
  'SFU_ANSWER',
  'SFU_CANDIDATE',
  'PING'
]);

const serverMessages = new Enum([
  'OPEN',
  'ERROR',
  'OFFER',
  'ANSWER',
  'CANDIDATE',
  'LEAVE',
  'ROOM_LOGS',
  'ROOM_USERS',
  'ROOM_DATA',
  'ROOM_USER_JOIN',
  'ROOM_USER_LEAVE',
  'SFU_OFFER'
]);



const util = {
  KEEPALIVETIMER: 25000,
  MESSAGE_TYPES : {
    CLIENT: clientMessages,
    SERVER: serverMessages
  }
}



module.exports = util