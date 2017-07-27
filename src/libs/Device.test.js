import Device from './Device'

describe('Device test', () => {
  let params

  beforeAll(() => {
    params = Object.assign({}, {
      uuid: 'test-uuid',
      profile: {},
      connection: {},
      peerid: 'test-peerid'
    })
  })

  afterAll(() => {
    params = {}
  })

  test('params is correct, it returns Device object', () => {
    expect(new Device(params)).toBeInstanceOf(Device)
  })

  test('when uuid is not string, it throws Error', () => {
    params.uuid = 0

    expect(() => new Device(params)).toThrow()
  })
  test('when profile is not object, it throws Error', () => {
    params.profile = 0

    expect(() => new Device(params)).toThrow()
  })
  test('when connection is not object, it throws Error', () => {
    params.connection = 0

    expect(() => new Device(params)).toThrow()
  })
})

