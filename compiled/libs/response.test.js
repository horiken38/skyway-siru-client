'use strict';

var Response = require('./response');

describe('check constructor', function () {
  var options = {};

  beforeEach(function () {
    options = Object.assign({}, {
      status: 200,
      method: "get",
      transaction_id: 12345,
      text: "hoge"
    });
  });

  afterEach(function () {
    options = Object.assign({});
  });

  test('correct pattern', function () {
    expect(new Response(options)).toBeDefined();
  });

  test('status code is not number', function () {
    options = Object.assign({}, options, { status: "200" });
    expect(function () {
      return new Response(options);
    }).toThrow();
  });

  test('method is not string', function () {
    options = Object.assign({}, options, { method: 80 });
    expect(function () {
      return new Response(options);
    }).toThrow();
  });

  test('transaction_id is not number', function () {
    options = Object.assign({}, options, { transaction_id: "hoge" });
    expect(function () {
      return new Response(options);
    }).toThrow();
  });

  test('text is not string', function () {
    options = Object.assign({}, options, { text: 80 });
    expect(function () {
      return new Response(options);
    }).toThrow();
  });
});

describe('check text()', function () {
  test('text() returns options.text', function () {
    var response = new Response({
      status: 200,
      method: 'get',
      transaction_id: 123,
      text: 'hello'
    });

    return response.text().then(function (text) {
      return expect(text).toBe('hello');
    });
  });
});

describe('check json()', function () {
  test('when text is JSON stringified, it returns json object', function () {
    var response = new Response({
      status: 200,
      method: 'get',
      transaction_id: 123,
      text: JSON.stringify({ text: 'hello' })
    });

    return response.json().then(function (json) {
      return expect(json).toEqual({ text: 'hello' });
    });
  });

  test('when text is not JSON stringified, it calls reject()', function () {
    var response = new Response({
      status: 200,
      method: 'get',
      transaction_id: 123,
      text: 'non json string'
    });

    return response.json().catch(function (e) {
      return expect(e.message).toMatch('Unexpected');
    });
  });
});