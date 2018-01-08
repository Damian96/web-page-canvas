var gulp = require('gulp');
var del = require('del');
var uglifyjs = require('gulp-uglify-es').default;
var uglifycss = require('gulp-uglifycss');

var paths = {
	css: [
		'src/about/*.css',
		'src/content-scripts/css/*.css',
		'src/popup/css/*.css'
	],
	js: [
		'src/background/*.js',
		'src/content-scripts/js/*.js',
		'src/popup/js/*.js',
	],
	other: [
		'src/images/*',
		'src/about/about.html',
		'src/popup/fonts/*',
		'src/popup/html/web-page-canvas.html',
		'src/manifest.json'
	]
};

// Not all tasks need to use streams
// A gulpfile is just another node program and you can use any package available on npm
var clean = function() {
  // You can use multiple globbing patterns as you would with `gulp.src`
  return del(['build/*']);
};

var minifyJS = function() {
	gulp.src(paths.js)
		.pipe(uglifyjs())
		.pipe(gulp.dest(destination));
};

var minifyCSS = function() {
	gulp.src(paths.css)
		.pipe(uglifycss(cssOptions))
		.pipe(gulp.dest(destination));
};

var copyOther = function() {
	gulp.src(paths.other)
		.pipe(gulp.dest(destination));
};

var watch = function() {
	gulp.watch(paths.js, minifyJS);
	gulp.watch(paths.css, minifyCSS);
	gulp.watch(paths.other, copyOther);
};

var build = gulp.series(clean, gulp.parallel(minifyCSS, minifyJS, copyOther));

gulp.task('build', build);
gulp.task('default', build);
gulp.task('watch', watch);