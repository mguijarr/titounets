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
               'react-yearly-calendar',
               'react-draft-wysiwyg',
               'draft-js'],
      utils: './src/utils.js'
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
        { test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "url-loader?limit=10000&mimetype=application/font-woff" },
        { test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "file-loader" }
      ],
    },
    plugins: [
      new webpack.optimize.CommonsChunkPlugin({
        names: ['vendor', 'utils', 'manifest']
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

