// @flow

class Device {
  uuid: string // uuid of this device
  profile: Object // profile data
  connection: Object // SkyWay connection object of this device

  /**
   * @params {string} uuid
   * @params {object} profile
   * @params {object} connection
   */
  constructor( {uuid, profile, connection}:
      {uuid: string, profile: Object, connection: Object} ) {
    if( typeof(uuid) !== 'string' ||
        typeof(profile) !== 'object' ||
        typeof(connection) !== 'object' ) throw new Error('Device: bad parameters')

    this.uuid = uuid
    this.profile = profile
    this.connection = connection
  }
}

export default Device
