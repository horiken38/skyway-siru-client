'use strict';

var _SiRuClient = require('./SiRuClient');

var _SiRuClient2 = _interopRequireDefault(_SiRuClient);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

jest.mock('../assets/skyway.js');

var roomName = void 0,
    key = void 0;
beforeAll(function () {
  roomName = 'testroom';
  key = 'test-key';
});
afterAll(function () {
  roomName = '';
});

describe('constructor() test', function () {
  var siru = void 0;
  beforeEach(function () {
    siru = new _SiRuClient2.default

    // after construction, 'connect' message will be fired. we will check state events at that moment.
    (roomName, { key: key });
  });

  afterEach(function () {
    siru = null;
  });

  test('when constructed, it will emit series of state messages', function (done) {
    var __events = [];
    var expected = ['SKYWAY_CONNECTED', 'ROOM_JOINED', 'USER_LIST_OBTAINED', 'STARTED'];

    // check making instance succeeded
    expect(siru).toBeInstanceOf(_SiRuClient2.default);siru.on('state:change', function (state) {
      __events.push(state);
    });

    siru.on('connect', function () {
      expect(__events).toMatchObject(expected);
      done();
    });
  });

  it('will fire meta event, after creation finished.', function (done) {
    siru.on('meta', function (profile) {
      expect(profile).toBeInstanceOf(Object);
      done();
    });
  });

  it('will raise error, when roomName is not specified', function () {
    expect(function () {
      return new _SiRuClient2.default(undefined, { key: key });
    }).toThrow();
    expect(function () {
      return new _SiRuClient2.default(123, { key: key });
    }).toThrow();
  });
  it('will raise error, when key is not specified', function () {
    expect(function () {
      return new _SiRuClient2.default(roomName, {});
    }).toThrow();
  });
});

describe('fetch() test', function () {
  var siru = void 0;
  beforeEach(function () {
    siru = new _SiRuClient2.default(roomName, { key: key });
  });

  afterEach(function () {
    siru = null;
  });
  it('will return "hello", when request path is "test-uuid/echo/hello"', function (done) {
    setTimeout(function (ev) {
      siru.fetch('test-uuid/echo/hello').then(function (res) {
        return res.text();
      }).then(function (text) {
        expect(text).toBe('hello');
        done();
      });
    }, 500);
  });

  it('will reject(), when request path is "unexist-uuid/echo/hello"', function () {
    return siru.fetch('unexist-uuid/echo/hello').catch(function (err) {
      expect(err).toBeDefined();
    });
  });
});

describe('pubsub test', function () {
  var siru = void 0;

  beforeEach(function () {
    siru = new _SiRuClient2.default(roomName, { key: key });
  });

  afterEach(function () {
    siru = null;
  });

  test('subscribe add topic', function () {
    expect(siru.subscribe('test')).toBeUndefined();
    expect(siru.topics).toMatchObject(['test']);
  });

  test('subscribe will raise error when topic is not string', function () {
    expect(function () {
      return siru.subscribe(0);
    }).toThrow();
  });

  test('when subscribe called with same topic, only one ', function () {
    siru.subscribe('same-topic');
    siru.subscribe('same-topic');
    expect(siru.topics).toMatchObject(['same-topic']);
  });

  test('unsubscribe remove topic', function () {
    siru.subscribe('test');
    siru.subscribe('other-topic');
    expect(siru.topics).toMatchObject(['test', 'other-topic']);
    siru.unsubscribe('other-topic');
    expect(siru.topics).toMatchObject(['test']);
  });

  test('unsubscribe will raise error when topic is not string', function () {
    expect(function () {
      return siru.unsubscribe(0);
    }).toThrow();
  });

  test('publish will fire string message, when subscribed', function (done) {
    siru.on('message', function (topic, message) {
      expect(topic).toBe('test');
      expect(message).toBe('hello');
      done();
    });

    siru.subscribe('test');
    siru.publish('test', 'hello');
  });

  test('publish will fire Object message, when subscribed', function (done) {
    siru.on('message', function (topic, message) {
      expect(topic).toBe('test');
      expect(message).toMatchObject({ str: 'hello' });
      done();
    });

    siru.subscribe('test');
    siru.publish('test', { str: 'hello' });
  });

  test('publish will raise error, when topic is not string', function () {
    expect(function () {
      return siru.publish(0, 'hoge');
    }).toThrow();
  });

  test('publish will raise error, when message is not string', function () {
    expect(function () {
      return siru.publish('test', 0);
    }).toThrow();
  });

  test('publish will not be fired, when not subscribed', function (done) {
    var ret = void 0;

    siru.on('message', function (topic, message) {
      ret = message;
    });
    siru.publish('test', 'hello');
    setTimeout(function (ev) {
      expect(ret).toBeUndefined();
      done();
    }, 1000);
  });
});

describe('streaming test', function () {
  var siru = void 0;
  var uuid = 'test-uuid';
  beforeEach(function () {
    siru = new _SiRuClient2.default(roomName, { key: key });
  });

  afterEach(function () {
    siru = null;
  });

  test('requestStreaming() will resolv stream object', function (done) {
    setTimeout(function (ev) {
      siru.requestStreaming(uuid).then(function (stream) {
        expect(stream).toBeInstanceOf(Object);
        done();
      });
    }, 500);
  });

  test('stopStreaming() will resolv', function (done) {
    setTimeout(function (ev) {
      siru.requestStreaming(uuid).then(function (stream) {
        return siru.stopStreaming(uuid);
      }).then(function (dummy) {
        expect(dummy).toBeUndefined();
        done();
      });
    }, 500);
  });
});