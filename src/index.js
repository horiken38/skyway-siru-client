/* entry point */

const SiRuClient = require('./libs/SiRuClient')

if(module.require) {
  // node.js
  module.exports = SiRuClient;
} else {
  // browser
  window.SiRuClient = SiRuClient;
}
