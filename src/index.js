/* entry point */

const skPubSub = require('./libs/skPubSub')

if(module.require) {
  // node.js
  module.exports = skPubSub;
} else {
  // browser
  window.skPubSub = skPubSub;
}