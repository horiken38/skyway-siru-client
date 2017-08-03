import SiRuClient from './SiRuClient'
import _ from 'underscore'
import EventEmitter from 'events'

jest.mock('../assets/skyway.js')

let roomName, key
beforeAll(() => {
  roomName = 'testroom'
  key = 'test-key'
})
afterAll(() => {
  roomName = ''
})

describe('constructor() test', () => {
  let siru
  beforeEach(() => {
    siru = new SiRuClient(roomName, {key})
  })

  afterEach(() => {
    siru = null
  })


  test('when constructed, it will emit series of state messages', done => {
    const __events = []
    const expected = [
      'SKYWAY_CONNECTED',
      'ROOM_JOINED',
      'USER_LIST_OBTAINED',
      'STARTED'
    ]

    // check making instance succeeded
    expect(siru).toBeInstanceOf(SiRuClient)

    // after construction, 'connect' message will be fired
    siru.on('state:change', (state) => {
      __events.push(state)

      if(state === _.last(expected)) {
        expect(__events).toMatchObject(expected)
        siru = null
        done()
      }
    })

  })

  it('will raise error, when roomName is not specified', () => {
    expect(() => new SiRuClient(undefined, { key })).toThrow()
    expect(() => new SiRuClient(123, { key })).toThrow()
  })
  it('will raise error, when key is not specified', () => {
    expect(() => new SiRuClient(roomName, { })).toThrow()
  })
})

describe('fetch() test', () => {
  let siru
  beforeEach(() => {
    siru = new SiRuClient(roomName, {key})
  })

  afterEach(() => {
    siru = null
  })
  it('will return "hello", when request path is "test-uuid/echo/hello"', done => {
    setTimeout( ev => {
      siru.fetch('test-uuid/echo/hello')
        .then(res => res.text())
        .then(text => {
          expect(text).toBe('hello')
          done()
        })
    }, 500)
  })

  it('will reject(), when request path is "unexist-uuid/echo/hello"', () => {
    return siru.fetch('unexist-uuid/echo/hello').catch( err => {
      expect(err).toBeDefined()
    })
  })
})

describe('pubsub test', () => {
  let siru

  beforeEach(() => {
    siru = new SiRuClient(roomName, {key})
  })

  afterEach(() => {
    siru = null
  })

  test('subscribe add topic', () => {
    expect(siru.subscribe('test')).toBe(true)
    expect(siru.topics).toMatchObject(['test'])
  })

  test('subscribe will return false when topic is not string', () => {
    expect(siru.subscribe(0)).toBe(false)
  })

  test('when subscribe called with same topic, only one ', () => {
    siru.subscribe('same-topic')
    siru.subscribe('same-topic')
    expect(siru.topics).toMatchObject(['same-topic'])
  })

  test('unsubscribe remove topic', () => {
    siru.subscribe('test')
    siru.subscribe('other-topic')
    expect(siru.topics).toMatchObject(['test', 'other-topic'])
    siru.unsubscribe('other-topic')
    expect(siru.topics).toMatchObject(['test'])
  })

  test('publish will fire string message, when subscribed', done => {
    siru.on('message', (topic, message) => {
      expect(topic).toBe('test')
      expect(message).toBe('hello')
      done()
    })

    siru.subscribe('test')
    siru.publish('test', 'hello')
  })

  test('publish will fire Object message, when subscribed', done => {
    siru.on('message', (topic, message) => {
      expect(topic).toBe('test')
      expect(message).toMatchObject({str: 'hello'})
      done()
    })

    siru.subscribe('test')
    siru.publish('test', {str: 'hello'})
  })

  test('publish will return false, when topic is not string', () => {
    expect(siru.publish(0, 'hoge')).toBe(false)
  })

  test('publish will return false, when message is not string', () => {
    expect(siru.publish('test', 0)).toBe(false)
  })

  test('publish will not be fired, when not subscribed', done => {
    let ret

    siru.on('message', (topic, message) => {
      ret = message
    })
    siru.publish('test', 'hello')
    setTimeout( ev => {
      expect(ret).toBeUndefined()
      done()
    }, 1000)
  })
})

describe('streaming test', () => {
  let siru
  const uuid = 'test-uuid'
  beforeEach(() => {
    siru = new SiRuClient(roomName, {key})
  })

  afterEach(() => {
    siru = null
  })

  test('requestStreaming() will resolv stream object', done => {
    setTimeout( ev => {
      siru.requestStreaming(uuid)
        .then( stream => {
          expect(stream).toBeInstanceOf(Object)
          done()
        })
    }, 500)
  })

  test('stopStreaming() will resolv', done => {
    setTimeout( ev => {
      siru.requestStreaming(uuid)
        .then( stream => siru.stopStreaming(uuid) )
        .then( dummy => {
          expect(dummy).toBeUndefined()
          done()
        })
   }, 500)
  })
})

