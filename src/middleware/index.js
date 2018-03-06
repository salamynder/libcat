'use strict';

const config = require('./webpack.config');
const webpack = require('webpack');

// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
  // Add your custom middleware here. Remember, that
  // in Express the order matters
  const compiler = webpack(config);

  app.use(require('webpack-dev-middleware')(compiler, {
    // historyApiFallback: true,
    stats: {colors: true},
    // noInfo: true,
  }));

  app.use(require('webpack-hot-middleware')(compiler));
};
