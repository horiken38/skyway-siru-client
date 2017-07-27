// @flow

/**
 * Device Manager
 *
 *
 */

import Device from './Device'
import util from './util'

const PROFILE_GET  = 'SSG:profile/get'
const STREAM_START = 'SSG:stream/start'
const STREAM_STOP  = 'SSG:stream/stop'
const TIMEOUT = 30000

class DeviceManager {
  devices: Array<Device>  // store other connecting devices
  peerid: string  // peerid of this device
  timeout: number   // timeout value waiting for profile from other device

  constructor() {
    this.devices = []
    this.peerid = ""
    this.timeout = TIMEOUT
  }

  /**
   * @param {string} peerid - my peerid
   */
  setPeerID(peerid: string): void {
    if( typeof(peerid) !== 'string' )
      throw new Error('setPeerID: peerid should be string')

    this.peerid = peerid
  }

  /**
   * This method 1st send request to get profile for peer.
   * When we receive respond of profile data, beginning from the preamble of 'SSG:',
   * we will register this device.
   *
   * @param {objcect} conn - datachannel connection object
   */
  register(conn: Object): Promise<any> {
    return new Promise((resolv, reject) => {
      // listener for profile response
      const registerListener =  data => {
        if(data.length < 4) return

        const head = data.slice(0,4).toString()
          , body = data.slice(4).toString()

        if(head !== "SSG:" ||  !util.isJSONString(body)) return

        this._register(conn, JSON.parse(body))
          .then((device) => {
            conn.removeListener('data', registerListener)
            resolv(device)
          }).catch(err => {
            conn.removeListener('data', registerListener)
            reject(err)
          })
      }

      // set listener
      conn.on('data', registerListener)

      // send profile request
      conn.send(PROFILE_GET)
    })
  }

  /**
   *
   * @param {object} conn - connection object
   * @param {object} data - data
   */
  _register(conn: Object, data: Object): Promise<any> {
    return new Promise((resolv, reject) => {
      const uuid      = data.body && data.body.uuid
        , connection  = conn
        , profile     = data.body
      let retFlag = false

      try {
        if(data.type === 'response' && data.target === 'profile' && data.method === 'get') {
          const device = new Device({uuid, connection, profile})

          // we will avoid duplicationg uuid. previous one will be removed
          this.devices = this.devices.filter(_device => _device.uuid !== uuid)

          this.devices.push(device)
          retFlag = true
          resolv(device)
        }
      } catch(err) {
        retFlag = true
        reject(err)
      }

      setTimeout(() => {
        if(!retFlag) reject( new Error('_register: timeout'))
      }, this.timeout)
    })
  }



  /**
   *
   * @param {string} uuid
   */
  getDataChannelConnection(uuid: string): Object | null{
    let conn = null;

    this.devices.filter(obj => {return obj.uuid === uuid})
      .forEach(obj => conn = obj.connection )

    return conn;
  }

  /**
   *
   * @param {string} uuid
   */
  getPeerid(uuid: string): string | null {
    let peerid = null;

    this.devices.filter(obj => obj.uuid === uuid)
      .forEach(obj => peerid = obj.profile.ssg_peerid)

    return peerid
  }

  /**
   *
   * @param {string} peerid
   */
  getUUID(peerid: string): string | null {
    let uuid = null;

    this.devices.filter(obj => obj.profile.ssg_peerid === peerid)
      .forEach(obj => uuid = obj.uuid)

    return uuid
  }


  /**
   * @param {string} uuid
   */
  exist(uuid: string): boolean {
    let ret = false

    this.devices.filter(device => device.uuid === uuid)
      .forEach(device => ret = true)
    return ret
  }
}

module.exports = new DeviceManager()
