'use strict';

var _util = require('./util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('utility test', function () {
  test('isJSONString return true, when str is JSON String', function () {
    var str = JSON.stringify({ "text": "hello" });
    expect(_util2.default.isJSONString(str)).toBe(true);
  });
  test('isJSONString return false, when str is not String', function () {
    var str = 1;
    expect(_util2.default.isJSONString(str)).toBe(false);
  });
  test('isJSONString return false, when str is not JSON String', function () {
    var str = "hello";
    expect(_util2.default.isJSONString(str)).toBe(false);
  });
});