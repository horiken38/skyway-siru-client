'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Response class for SiRuClient
 * @class
 *
 * @param {Object} params - parameter
 * @param {number} params.status - 200,404 etc.
 * @param {string} params.method - "get", "post" etc
 * @param {number} params.transaction_id - transaction id
 * @param {string} params.text - response text
 */
var Response = function () {
  function Response(params) {
    _classCallCheck(this, Response);

    if (typeof params.status !== 'number' || typeof params.method !== 'string' || typeof params.transaction_id !== 'number' || typeof params.text !== 'string') throw new Error('invalid options');

    this.status = params.status;
    this.method = params.method;
    this.transaction_id = params.transaction_id;
    this._text = params.text;
  }
  /**
   * get response text
   *
   * @returns {Promise<string>} response text
   * @method Response#text
   */


  _createClass(Response, [{
    key: 'text',
    value: function text() {
      var _this = this;

      return new Promise(function (resolv, reject) {
        if (_this._text && typeof _this._text === 'string') resolv(_this._text);else reject(new Error("can not find text"));
      });
    }

    /**
     * get response in json object
     *
     * @returns {Promise<Object>} response in json object
     * @method Response#json
     */

  }, {
    key: 'json',
    value: function json() {
      var _this2 = this;

      return new Promise(function (resolv, reject) {
        _this2.text().then(function (text) {
          try {
            var json = JSON.parse(text);
            resolv(json);
          } catch (err) {
            reject(err);
          }
        }).catch(function (err) {
          reject(err);
        });
      });
    }
  }]);

  return Response;
}();

module.exports = Response;