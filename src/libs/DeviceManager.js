/**
 * Device Manager
 * 
 * 
 */

const EventEmitter = require('events').EventEmitter
const log4js = require('log4js')
const logger = log4js.getLogger('DeviceManager')

const PROFILE_GET  = 'SSG:profile/get'
const STREAM_START = 'SSG:stream/start'
const STREAM_STOP  = 'SSG:stream/stop'

class DeviceManager extends EventEmitter {
  constructor() {
    super();
    
    /**
     * @property {string} device.uuid
     * @property {object} device.connection
     * @property {object} device.profile
     */
    this.devices = []
  }

  /**
   * 
   * @param {string} peerid - my peerid
   */
  start(peerid) {
    this.peerid = peerid
  }

  /**
   * 
   * @param {objcect} conn - datachannel connection object
   */
  register(conn) {
    conn.send(PROFILE_GET)
    logger.debug(`send profile get messaage ${PROFILE_GET}`)

    conn.on('data', data => {
      try {
        if(data.slice(0,4).toString() === "SSG:") {
          this.handleCtrlData(conn, JSON.parse(data.slice(4).toString()))
        }
      } catch(e) {
        logger.warn(e)
      }
    })
  }

  /**
   * 
   * @param {string} uuid 
   */
  getDataChannelConnection(uuid){
    let conn;

    this.devices.filter(obj => {return obj.uuid === uuid})
      .forEach(obj => conn = obj.connection )

    return conn;
  }

  /**
   * 
   * @param {string} uuid 
   */
  getPeerid(uuid) {
    let peerid;

    this.devices.filter(obj => obj.uuid === uuid)
      .forEach(obj => peerid = obj.profile.ssg_peerid)
    
    return peerid
  }

  /**
   * 
   * @param {string} peerid 
   */
  getUUID(peerid) {
    let uuid;

    this.devices.filter(obj => obj.profile.ssg_peerid === peerid)
      .forEach(obj => uuid = obj.uuid)
    
    return uuid
  }



  /**
   * 
   * @param {object} conn - connection object 
   * @param {object} data - data
   */
  handleCtrlData(conn, data) {
    logger.debug("handle Ctrol data", data)
    if(data.type === 'response'
      && data.target === 'profile' 
      && data.method === 'get' 
      && typeof(data.body) === 'object'
      && typeof(data.body.uuid) === 'string') {

      const newDevice = {
        uuid: data.body.uuid,
        connection: conn,
        profile: data.body
      }
      logger.debug(data.body)

      this.devices.push(newDevice)
      this.emit('meta', newDevice.profile)
    }
  }

  /**
   * @param {string} uuid
   */
  getConnection(uuid) {
    let ret;
    this.devices.filter(device => device.uuid === uuid)
      .forEach(device => ret = device.connection)
    
    return ret;
  }

  /**
   * @param {string} uuid
   */
  exist(uuid) {
    let ret = false

    this.devices.filter(device => device.uuid === uuid)
      .forEach(device => ret = true)
    return ret
  }
}

module.exports = new DeviceManager()