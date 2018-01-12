var gulp = require('gulp');
var del = require('del');
var uglifyjs = require('gulp-uglify-es').default;
var uglifycss = require('gulp-uglifycss');

var paths = {
	css: [
		'src/about/*.css',
		'src/web-resources/css/*.css',
		'src/popup/css/*.css'
	],
	js: [
		'src/background/*.js',
		'src/web-resources/js/*.js',
		'src/popup/js/*.js',
	],
	other: [
		'src/images/*',
		'src/about/about.html',
		'src/icons/fonts/*',
		'src/icons/*.css',
		'src/popup/html/web-page-canvas.html',
		'src/web-resources/html/web-page-canvas.html',
		'src/manifest.json'
	]
};

// Not all tasks need to use streams
// A gulpfile is just another node program and you can use any package available on npm
var clean = function() {
  // You can use multiple globbing patterns as you would with `gulp.src`
  return del(['build/*']);
};

var destination = function(file) {
	// dirname = base
	return file.base.replace('\\src\\', '\\build\\');
};

var minifyJS = function() {
	gulp.src(paths.js)
		.pipe(uglifyjs())
		.pipe(gulp.dest(destination));
};

var minifyCSS = function() {
	var cssOptions = {uglyComments: true};
	gulp.src(paths.css)
		.pipe(uglifycss(cssOptions))
		.pipe(gulp.dest(destination));
};

var copyOther = function() {
	gulp.src(paths.other)
		.pipe(gulp.dest(destination));
};

gulp.task('minifyJS', minifyJS);
gulp.task('minifyCSS', minifyCSS);
gulp.task('copyOther', copyOther);

gulp.task('build', ['minifyCSS', 'minifyJS', 'copyOther']);
gulp.task('watch', function() {
	gulp.watch(paths.js, minifyJS);
	gulp.watch(paths.css, minifyCSS);
	gulp.watch(paths.other, copyOther);
});

gulp.task('clean', clean);
gulp.task('default', ['minifyCSS', 'minifyJS', 'copyOther', 'watch']);