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
  test('when constructed, it will emit "SKYWAY_CONNECTED", "MESSAGEHUB_CONNECTED", "CONNECTED"  then "WAITING" messages', done => {
    jest.useFakeTimers()
    const siru = new SiRuClient(roomName, {key})
    jest.runAllTimers()
    const __events = []

    // check making instance succeeded
    expect(siru).toBeInstanceOf(SiRuClient)

    // after construction, 'connect' message will be fired
    siru.on('state:change', (state) => {
      __events.push(state)

      if(state === "WAITING") {
        expect(__events).toMatchObject(['SKYWAY_CONNECTED', 'MESSAGEHUB_CONNECTED', 'CONNECTED', 'WAITING'])
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

