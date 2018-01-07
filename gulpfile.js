var gulp = require('gulp');
var del = require('del');
var uglifyjs = require('gulp-uglify-es').default;
var uglifycss = require('gulp-uglifycss');
var pump = require('pump');


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
gulp.task('clean', function() {
  // You can use multiple globbing patterns as you would with `gulp.src`
  return del(['build/*']);
});

gulp.task('build', function () {
	// the same options as described above
	var cssOptions = {uglyComments: true};
	var destination = function(file) {
		// dirname = base
		return file.base.replace('\\src\\', '\\build\\');
	};

	// Minify CSS
	gulp.src(paths.css)
		.pipe(uglifycss(cssOptions))
		.pipe(gulp.dest(destination));

	// Minify JS
	gulp.src(paths.js)
		.pipe(uglifyjs())
		.pipe(gulp.dest(destination));

	// Copy Other Files
	return gulp.src(paths.other)
		.pipe(gulp.dest(destination));

});