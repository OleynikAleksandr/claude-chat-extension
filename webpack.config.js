const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/multi-session/webview/index.tsx',
    output: {
      path: path.resolve(__dirname, 'out/webview'),
      filename: 'bundle.js',
      clean: true
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx']
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.webview.json'
            }
          },
          exclude: /node_modules/
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/multi-session/webview/index.html',
        filename: 'index.html'
      })
    ],
    // Отключаем source maps в production для избежания проблем с загрузкой
    devtool: isProduction ? false : 'inline-source-map'
  };
};