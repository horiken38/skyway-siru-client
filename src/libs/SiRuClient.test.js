import SiRuClient from './SiRuClient'

jest.mock('../assets/skyway.js')
import SkyWay from '../assets/skyway.js'

SkyWay.mockImplementation(() => {
  return {
  }
})

describe('constructor() test', () => {
  it('will create instance, when called with collect parameters', () => {
  })
})
