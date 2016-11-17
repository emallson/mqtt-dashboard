'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var webpack = require('webpack-stream');
var wp = require('webpack');
var wp_server = require('webpack-dev-server');

gulp.task('pack', function() {
  return gulp.src('src/index.js')
    .pipe(webpack(require('./webpack.config.js')))
    .pipe(gulp.dest('dist/'));
});

gulp.task('serve', function(cb) {
  let config = Object.assign({devtool: "eval", debug: true}, require("./webpack.config.js"));
  config.entry.app.unshift("webpack-dev-server/client?http://localhost:8080/");
  new wp_server(wp(config), {
    publicPath: "/" + config.output.publicPath,
    stats: {
      colors: true
    }
  }).listen(8080, "localhost", function(err) {
    if(err) throw new gutil.PluginError("webpack-dev-server", err);
    gutil.log("[webpack-dev-server]", "http://localhost:8080/webpack-dev-server/index.html");
  });
});

gulp.task('default', ['serve']);
