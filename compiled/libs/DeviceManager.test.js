'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Device = require('./Device');

var _Device2 = _interopRequireDefault(_Device);

var _DeviceManager = require('./DeviceManager');

var _DeviceManager2 = _interopRequireDefault(_DeviceManager);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;

var deviceManager = void 0;

beforeEach(function () {
  deviceManager = new _DeviceManager2.default();
});

afterEach(function () {
  deviceManager = null;
});

describe('setPeerID() test', function () {
  it('will set peerid when it is string', function () {
    var peerid = 'mypeerid';
    deviceManager.setPeerID(peerid);
    expect(deviceManager.peerid).toBe(peerid);
  });

  it('will throw error, when peerid is not string', function () {
    var peerid = 0;
    expect(function () {
      return deviceManager.setPeerID(peerid);
    }).toThrow();
  });
});

describe('_register() test', function () {
  var conn = void 0,
      data = void 0;

  beforeEach(function () {
    conn = {};
    data = {
      type: 'response',
      target: 'profile',
      method: 'get',
      body: {
        uuid: 'test-uuid',
        ssg_peerid: 'ssg-peerid'
      }
    };
  });

  afterEach(function () {
    conn = null;
    data = null;
  });

  it('will register, when parameters are correct', function () {
    return deviceManager._register(conn, data).then(function (device) {
      expect(device).toBeInstanceOf(_Device2.default);
    });
  });

  it('will register only one later device, when same uuid is used', function () {
    var data2 = Object.assign({}, data, { body: { uuid: 'test-uuid', peerid: 'test-peerid', message: 'latest' } });

    return deviceManager._register(conn, data).then(function () {
      return deviceManager._register(conn, data2);
    }).then(function (device) {
      expect(deviceManager.devices).toHaveLength(1);
      expect(deviceManager.devices[0]).toMatchObject(device);
    });
  });

  it('will raise timeout error, when type is not "response"', function () {
    jest.useFakeTimers();
    data.type = 'not_response';

    var test = deviceManager._register(conn, data).catch(function (err) {
      expect(err.message).toMatch(/timeout/);
      expect(setTimeout.mock.calls.length).toBe(1);
      expect(setTimeout.mock.calls[0][1]).toBe(deviceManager.timeout);
    });

    jest.runAllTimers // fast-forward the timer
    ();return test;
  });
  it('will raise timeout error, when target is not "profile"', function () {
    jest.useFakeTimers();
    data.target = 'not_profile';

    var test = deviceManager._register(conn, data).catch(function (err) {
      expect(err.message).toMatch(/timeout/);
      expect(setTimeout.mock.calls.length).toBe(1);
      expect(setTimeout.mock.calls[0][1]).toBe(deviceManager.timeout);
    });

    jest.runAllTimers // fast-forward the timer
    ();return test;
  });
  it('will raise timeout error, when method is not "get"', function () {
    jest.useFakeTimers();
    data.method = 'not_get';

    var test = deviceManager._register(conn, data).catch(function (err) {
      expect(err.message).toMatch(/timeout/);
      expect(setTimeout.mock.calls.length).toBe(1);
      expect(setTimeout.mock.calls[0][1]).toBe(deviceManager.timeout);
    });

    jest.runAllTimers // fast-forward the timer
    ();return test;
  });
  it('will raise error, when body is undefined', function () {
    data.body = undefined;

    return deviceManager._register(conn, data).catch(function (err) {
      return expect(err.message).toBeDefined();
    });
  });
  it('will raise error, when uuid is undefined', function () {
    data.body = { uuid: undefined };

    return deviceManager._register(conn, data).catch(function (err) {
      return expect(err.message).toBeDefined();
    });
  });
  it('will raise error, when uuid is not string', function () {
    data.body = { uuid: 0 };

    return deviceManager._register(conn, data).catch(function (err) {
      return expect(err.message).toBeDefined();
    });
  });
  it('will raise error, when conn is not object', function () {
    conn = 'hello world';

    return deviceManager._register(conn, data).catch(function (err) {
      return expect(err.message).toBeDefined();
    });
  });
});

var Conn = function (_EventEmitter) {
  _inherits(Conn, _EventEmitter);

  function Conn() {
    _classCallCheck(this, Conn);

    var _this = _possibleConstructorReturn(this, (Conn.__proto__ || Object.getPrototypeOf(Conn)).call(this));

    _this.preamble = 'SSG:';
    _this.body = JSON.stringify({
      type: 'response',
      target: 'profile',
      method: 'get',
      body: {
        uuid: 'test-uuid',
        ssg_peerid: 'ssg-peerid'
      }
    });
    _this.data = '';
    _this.createData();
    return _this;
  }

  _createClass(Conn, [{
    key: 'createData',
    value: function createData() {
      this.data = [this.preamble, this.body].join("");
    }
  }, {
    key: 'send',
    value: function send(path) {
      if (path === 'SSG:profile/get') this.emit('data', Buffer.from(this.data));
    }
  }]);

  return Conn;
}(EventEmitter);

describe('register() test', function () {
  var conn = void 0,
      device = void 0;

  beforeEach(function () {
    conn = new Conn();
    device = new _Device2.default({
      uuid: 'test-uuid',
      profile: { uuid: 'test-uuid', ssg_peerid: 'ssg-peerid' },
      connection: conn,
      peerid: 'ssg-peerid'
    });
  });

  afterEach(function () {
    conn = null;
    device = null;
  });

  it('will register device, when profile response from peer is correct', function () {
    return deviceManager.register(conn).then(function (ret) {
      expect(ret).toMatchObject(device);
      expect(deviceManager.devices).toHaveLength(1);
    });
  });

  it('will raise timeout error, when profile response body is too short', function () {
    conn.body = '';
    conn.createData();
    jest.useFakeTimers();

    var test = deviceManager.register(conn).then(function (device) {
      return console.log(device);
    }).catch(function (err) {
      expect(err.message).toMatch(/timeout/);
    });
    jest.runAllTimers();
    return test;
  });

  it('will raise timeout error, when profile preamble of response body is incorrect', function () {
    conn.preamble = 'ssg:';
    conn.createData();
    jest.useFakeTimers();

    var test = deviceManager.register(conn).then(function (device) {
      return console.log(device);
    }).catch(function (err) {
      expect(err.message).toMatch(/timeout/);
    });
    jest.runAllTimers();
    return test;
  });

  it('will raise timeout error, when profile response does not include uuid', function () {
    conn.body = JSON.stringify({
      type: 'response', target: 'profile', method: 'get',
      body: { UUID: 'test-uuid', peerid: 'ssg-peerid' }
    });

    conn.createData();
    jest.useFakeTimers();

    var test = deviceManager.register(conn).then(function (device) {
      return console.log(device);
    }).catch(function (err) {
      expect(err.message).toMatch(/timeout/);
    });
    jest.runAllTimers();
    return test;
  });

  it('will raise timeout error, when profile response does not include peerid', function () {
    conn.body = JSON.stringify({
      type: 'response', target: 'profile', method: 'get',
      body: { uuid: 'test-uuid', PEERID: 'ssg-peerid' }
    });

    conn.createData();
    jest.useFakeTimers();

    var test = deviceManager.register(conn).then(function (device) {
      return console.log(device);
    }).catch(function (err) {
      expect(err.message).toMatch(/timeout/);
    });
    jest.runAllTimers();
    return test;
  });
});

describe('unregister() test', function () {
  var conn = void 0,
      device = void 0;

  beforeEach(function () {
    conn = new Conn();
    device = new _Device2.default({
      uuid: 'test-uuid',
      profile: { uuid: 'test-uuid', ssg_peerid: 'ssg-peerid' },
      connection: conn,
      peerid: 'ssg-peerid'
    });
  });

  afterEach(function () {
    conn = null;
    device = null;
  });

  it('will remove device, when proper uuid is specified', function () {
    return deviceManager.register(conn).then(function (device) {
      expect(deviceManager.devices).toHaveLength(1);
      return deviceManager.unregister(device.uuid);
    }).then(function () {
      return expect(deviceManager.devices).toHaveLength(0);
    });
  });

  it('will raise reject, when uuid is not exist', function () {
    return deviceManager.register(conn).then(function (device) {
      expect(deviceManager.devices).toHaveLength(1);
      return deviceManager.unregister('unexist-uuid');
    }).catch(function (err) {
      return expect(err).toBeDefined();
    });
  });
});

describe('setCallObect(uuid, call) test', function () {
  var conn = void 0,
      device = void 0;

  beforeEach(function () {
    conn = new Conn();
    device = new _Device2.default({
      uuid: 'test-uuid',
      profile: { uuid: 'test-uuid', ssg_peerid: 'ssg-peerid' },
      connection: conn,
      peerid: 'ssg-peerid'
    });
    deviceManager.register(conn);
  });

  afterEach(function () {
    conn = null;
    device = null;
  });

  it('will set call object, when uuid is exist. then return true', function () {
    expect(deviceManager.setCallObject('test-uuid', {})).toBe(true);
  });

  it('will return false, when uuid is unexist.', function () {
    expect(deviceManager.setCallObject('unexist-uuid', {})).toBe(false);
  });
});

describe('unsetCallObject(uuid) test', function () {
  var conn = void 0,
      device = void 0;

  beforeEach(function () {
    conn = new Conn();
    deviceManager.register(conn).then(function () {
      return deviceManager.setCallObject('test-uuid', {});
    });
  });

  afterEach(function () {
    conn = null;
    device = null;
  });

  it('will return true, when uuid is exist', function () {
    expect(deviceManager.unsetCallObject('test-uuid')).toBe(true);
  });

  it('will return false, when uuid is unexist', function () {
    expect(deviceManager.unsetCallObject('unexist-uuid')).toBe(false);
  });
});

describe('getCallObject(uuid) test', function () {
  var conn = void 0,
      device = void 0,
      callObj = void 0;

  var Call = function Call() {
    _classCallCheck(this, Call);
  };

  beforeEach(function (done) {
    conn = new Conn();
    callObj = new Call();
    deviceManager.register(conn).then(function () {
      deviceManager.setCallObject('test-uuid', callObj);
      done();
    });
  });

  afterEach(function () {
    conn = null;
    device = null;
    callObj = null;
  });

  it('will return Object, when uuid is exist', function () {
    expect(deviceManager.getCallObject('test-uuid')).toBeInstanceOf(Call);
  });

  it('will return null, when uuid is unexist', function () {
    expect(deviceManager.getCallObject('unexist-uuid')).toBeNull();
  });
});

describe('utility methods test', function () {
  var conn = void 0,
      device = void 0;

  beforeEach(function () {
    conn = new Conn();
    deviceManager.register(conn);

    device = new _Device2.default({
      uuid: 'test-uuid',
      profile: { uuid: 'test-uuid', ssg_peerid: 'ssg-peerid' },
      connection: conn,
      peerid: 'ssg-peerid'
    });
  });

  afterEach(function () {
    conn = null;
    device = null;
  });

  test('getDataChannelConnection() returns connection instance when uuid exists', function () {
    expect(deviceManager.getDataChannelConnection('test-uuid')).toMatchObject(conn);
  });

  test('getDataChannelConnection() returns null when uuid unexists', function () {
    expect(deviceManager.getDataChannelConnection('unexist-uuid')).toBeNull();
  });

  test('getPeerid() returns peerid when uuid exists', function () {
    expect(deviceManager.getPeerid('test-uuid')).toBe('ssg-peerid');
  });

  test('getPeerid() returns NULL when uuid unexists', function () {
    expect(deviceManager.getPeerid('unexist-uuid')).toBeNull();
  });

  test('getUUID() returns uuid when peerid exists', function () {
    expect(deviceManager.getUUID('ssg-peerid')).toBe('test-uuid');
  });

  test('getUUID() returns NULL when peerid unexists', function () {
    expect(deviceManager.getUUID('unexist-peerid')).toBeNull();
  });

  test('exist() returns true when uuid exists', function () {
    expect(deviceManager.exist('test-uuid')).toBe(true);
  });

  test('exist() returns false when uuid unexists', function () {
    expect(deviceManager.exist('unexist-uuid')).toBe(false);
  });
});