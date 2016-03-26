var gulp = require('gulp');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var nodemon = require('gulp-nodemon');
var watch = require('gulp-watch');

gulp.task('browser-sync', function() {
    browserSync.init(null, {
        proxy: "localhost:5001",
        open:false
    });
});

gulp.task('default', ['browser-sync', 'nodemon'], function () {
    watch(['**/*.*'],function(){
        console.log('reloading');
        reload();
    });
});

gulp.task('nodemon', function () {
    nodemon({script:'app.js'});
});