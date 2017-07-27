import Device from './Device'

const EventEmitter = require('events').EventEmitter

let DeviceManager = null


beforeAll(() => {
  DeviceManager = require('./DeviceManager')
})

afterAll(() => {
  DeviceManager = null
})

describe('setPeerID() test', () => {
  it('will set peerid when it is string', () => {
    const peerid = 'mypeerid'
    DeviceManager.setPeerID(peerid)
    expect(DeviceManager.peerid).toBe(peerid)
  })

  it('will throw error, when peerid is not string', () => {
    const peerid = 0
    expect(() => DeviceManager.setPeerID(peerid)).toThrow()
  })
})

describe('_register() test', () => {
  let conn, data

  beforeEach(() => {
    conn = {}
    data = {
      type: 'response',
      target: 'profile',
      method: 'get',
      body: {
        uuid: 'test-uuid'
      }
    }
  })

  afterEach(() => {
    conn = null
    data = null
  })

  it('will register, when parameters are correct', () => {
    return DeviceManager._register(conn, data).then(device => {
      expect(device).toBeInstanceOf(Device)
    })
  })

  it('will register only one later device, when same uuid is used', () => {
    const data2 = Object.assign({}, data, { body: { uuid: 'test-uuid', message: 'latest' }})

    return DeviceManager._register(conn, data)
      .then(() => DeviceManager._register(conn, data2))
      .then( device => {
        expect(DeviceManager.devices).toHaveLength(1)
        expect(DeviceManager.devices[0]).toMatchObject(device)
      })
  })

  it('will raise timeout error, when type is not "response"', () => {
    jest.useFakeTimers()
    data.type = 'not_response'

    const test = DeviceManager._register(conn, data)
      .catch( err => {
        expect(err.message).toMatch(/timeout/)
        expect(setTimeout.mock.calls.length).toBe(1)
        expect(setTimeout.mock.calls[0][1]).toBe(DeviceManager.timeout)
      })

    jest.runAllTimers()  // fast-forward the timer
    return test
  })
  it('will raise timeout error, when target is not "profile"', () => {
    jest.useFakeTimers()
    data.target = 'not_profile'

    const test = DeviceManager._register(conn, data)
      .catch( err => {
        expect(err.message).toMatch(/timeout/)
        expect(setTimeout.mock.calls.length).toBe(1)
        expect(setTimeout.mock.calls[0][1]).toBe(DeviceManager.timeout)
      })

    jest.runAllTimers()  // fast-forward the timer
    return test
  })
  it('will raise timeout error, when method is not "get"', () => {
    jest.useFakeTimers()
    data.method = 'not_get'

    const test = DeviceManager._register(conn, data)
      .catch( err => {
        expect(err.message).toMatch(/timeout/)
        expect(setTimeout.mock.calls.length).toBe(1)
        expect(setTimeout.mock.calls[0][1]).toBe(DeviceManager.timeout)
      })

    jest.runAllTimers()  // fast-forward the timer
    return test
  })
  it('will raise error, when body is undefined', () => {
    data.body = undefined

    return DeviceManager._register(conn, data)
      .catch(err => expect(err.message).toBeDefined())
  })
  it('will raise error, when uuid is undefined', () => {
    data.body = {uuid: undefined}

    return DeviceManager._register(conn, data)
      .catch(err => expect(err.message).toBeDefined() )
  })
  it('will raise error, when uuid is not string', () => {
    data.body = {uuid: 0}

    return DeviceManager._register(conn, data)
      .catch(err => expect(err.message).toBeDefined())
  })
  it('will raise error, when conn is not object', () => {
    conn = 'hello world'

    return DeviceManager._register(conn, data)
      .catch(err => expect(err.message).toBeDefined())
  })
})

describe('register() test', () => {
  let conn,device

  class Conn extends EventEmitter {
    constructor() {
      super()

      this.preamble = 'SSG:'
      this.body = JSON.stringify({
        type: 'response',
        target: 'profile',
        method: 'get',
        body: {
          uuid: 'test-uuid'
        }
      })
      this.data = ''
      this.createData()
    }

    createData() {
      this.data = [this.preamble, this.body].join("")
    }

    send(path) {
      if(path === 'SSG:profile/get') this.emit('data', Buffer.from(this.data))
    }
  }

  beforeEach(() => {
    conn = new Conn()
    device = new Device({
      uuid: 'test-uuid',
      profile: { uuid: 'test-uuid' },
      connection: conn
    })
  })

  afterEach(() => {
    conn = null
  })

  it('will register device, when profile response from peer is correct', () => {
    return DeviceManager.register(conn).then( ret => {
      expect(ret).toMatchObject(device)
      expect(DeviceManager.devices).toHaveLength(1)
    })
  })

  it('will raise error, when profile response body from peer is incorrect', () => {
    conn.body = ''
    conn.createData()

    // todo - useFakeTimer and runAllTimers
  })
})
