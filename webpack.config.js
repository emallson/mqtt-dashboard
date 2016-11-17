module.exports = {
  entry: {
    app: ["./src/index.jsx"]
  },
  output: {
    path: __dirname + '/dist/',
    filename: "bundle.js",
    publicPath: "public/"
  },
  devServer: {
    contentBase: './dist',
  },
  devtool: "source-map",
  module: {
    loaders: [
      {
        test: /.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          presets: ['es2015', 'react']
        }
      }
    ]
  }
};
