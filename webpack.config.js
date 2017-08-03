const webpack = require('webpack');

const path = require('path')
let _entry

switch(process.env.NODE_ENV) {
  default:
    _entry = {
      "SiRuClient": "./src/build"
    };
    break;
}

const JS_INCLUDES = path.join(__dirname, "src")

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
      {
        test : /\.js$/,
        include: JS_INCLUDES,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['es2015', 'flow'],
            },
          }
        ],
      },
      { test: /\.json$/, loader: 'json' }
    ],
  },
  resolve: {
    extensions: ['.js', '.json']
  },
  plugins: [
  ],
  node: {
  }
}

// npm --save-dev install babel-core babel-loader babel-polyfill babel-preset-es2015 babel-preset-react jest json-loader nock react react-dom webpack
//
