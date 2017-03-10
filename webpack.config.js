var webpack = require('webpack');
var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function(env) {
  return {
    entry: {
      main: './src/main.js',
      vendor: ['moment',
               'moment-range',
               'react-bootstrap',
               'react',
               'react-router',
               'react-router-bootstrap',
               'react-bootstrap-slider',
               'react-bootstrap-time-picker',
               'react-bootstrap-date-picker', 
               'react-yearly-calendar']
    },
    output: {
      filename: '[chunkhash].[name].js',
      path: path.resolve(__dirname, './static')
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: [
            'babel-loader',
          ],
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: [
          {
            loader: "style-loader"
          },
          {
            loader: "css-loader",
            options: {
              modules: false
            }
          }],
        },
        { test: /\.gif$/, use: "file-loader" },
        { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, use: "file-loader" },
        { test: /\.(woff|woff2)$/, use:"url-loader?prefix=font/&limit=5000" },
        { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, use: "url-loader?limit=10000&mimetype=application/octet-stream" },
        { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, use: "url-loader?limit=10000&mimetype=image/svg+xml" }
      ],
    },
    plugins: [
      new webpack.optimize.CommonsChunkPlugin({
        names: ['vendor', 'manifest']
      }),
      new HtmlWebpackPlugin({
        title: 'Titounets',
        filename: 'index.html',
        template: 'index.html.template'
      }),
      new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /fr(%|\.js)/)
    ]
  }
};

