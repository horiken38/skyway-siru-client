'use strict';

var _Device = require('./Device');

var _Device2 = _interopRequireDefault(_Device);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('constructor test', function () {
  var params = void 0;

  beforeAll(function () {
    params = Object.assign({}, {
      uuid: 'test-uuid',
      profile: {},
      connection: {},
      peerid: 'test-peerid'
    });
  });

  afterAll(function () {
    params = {};
  });

  test('params is correct, it returns Device object', function () {
    expect(new _Device2.default(params)).toBeInstanceOf(_Device2.default);
  });

  test('when uuid is not string, it throws Error', function () {
    params.uuid = 0;

    expect(function () {
      return new _Device2.default(params);
    }).toThrow();
  });
  test('when profile is not object, it throws Error', function () {
    params.profile = 0;

    expect(function () {
      return new _Device2.default(params);
    }).toThrow();
  });
  test('when connection is not object, it throws Error', function () {
    params.connection = 0;

    expect(function () {
      return new _Device2.default(params);
    }).toThrow();
  });
});

describe('setCallObj and unsetCallObj test', function () {
  var device = void 0,
      params = void 0;

  beforeEach(function () {
    params = Object.assign({}, {
      uuid: 'test-uuid',
      profile: {},
      connection: {},
      peerid: 'test-peerid'
    });
    device = new _Device2.default(params);
  });

  afterEach(function () {
    params = {};
    device = null;
  });

  test('setCallObj(callobj) return true, when typeof callobj equal object', function () {
    expect(device.setCallObj({})).toBe(true);
  });

  test('setCallObj(callobj) return false, when typeof callobj is not object', function () {
    expect(device.setCallObj(null)).toBe(false);
  });

  test('unsetCallObj() remove callobj', function () {
    device.setCallObj({});
    expect(device.callobj).toBeInstanceOf(Object);
    device.unsetCallObj();
    expect(device.callobj).toBeNull();
  });
});