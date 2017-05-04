var webpack = require('webpack');

var path = require('path')
  , _entry;

switch(process.env.NODE_ENV) {
  default:
    _entry = {
      "SiRu-client": "./src/index"
    };
    break;
}

module.exports = {
  entry: _entry,
  devtool: "source-map",
  output: {
    path: path.join(__dirname, "dist"),
    publicPath: '/dist/',
    filename: process.env.NODE_ENV === "production" ? "[name].min.js" : "[name].js"
  },
  module: {
    rules: [
    ],
    loaders: [
      { test: /\.json$/, loader: 'json' },
      {
        test: /\.(js|jsx)?$/,
        exclude: /(node_modules)/,
        loader: 'babel', // 'babel-loader' is also a legal name to reference
        query: {
          presets: ['react', 'es2015']
        }
      },
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },
  plugins: [
    new webpack.IgnorePlugin(/^(cluster|hipchat-notifier|axios|loggly|mailgun-js|slack-node|nodemailer)$/)
  ],
  node: {
    "fs":    "empty",
    "dgram": "empty",
    "net":   "empty",
    "child_process": "empty"
  }
}

// npm --save-dev install babel-core babel-loader babel-polyfill babel-preset-es2015 babel-preset-react jest json-loader nock react react-dom webpack
