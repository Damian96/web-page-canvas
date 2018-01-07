var gulp = require('gulp');
var del = require('del');
var uglifyjs = require('uglifyjs');
var uglifycss = require('uglifycss');
var composer = require('gulp-uglify/composer');
var pump = require('pump');
var minifyjs = composer(uglifyjs, console);
var minifycss= composer(uglifycss, console);

var paths = {
	css: [
		'src/about/*.css',
		'src/content-scripts/css/*.css',
		'src/popup/css/*.css'
	],
	scripts: [
		'src/about/*.js',
		'src/background/*.js',
		'src/content-scripts/js/*.js',
		'src/popup/js/*.js',
	],
	images: 'src/images/*'
};

// Not all tasks need to use streams
// A gulpfile is just another node program and you can use any package available on npm
gulp.task('clean', function() {
  // You can use multiple globbing patterns as you would with `gulp.src`
  return del(['build']);
});

gulp.task('compress', function (cb) {
	// the same options as described above
	var cssOptions = {};

	pump([
			gulp.src(paths.css),
			// minifycss({ uglyComments: true }),
			minifycss(),
			gulp.dest(function(file) {
				return 'build/' + file.relative.replace('.js', '.min.js');
			})
		],
		cb
	);

});