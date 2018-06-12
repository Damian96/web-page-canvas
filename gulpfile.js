var gulp = require('gulp');
var del = require('del');
var uglifyjs = require('gulp-uglify-es').default;
var uglifycss = require('gulp-uglifycss');
var jshint = require('gulp-jshint');
var package = require('./package');

var paths = {
    css: [
        'src/about/*.css',
        'src/web-resources/css/*.css',
        'src/popup/css/*.css',
        'src/web-resources/icons/*.css',
    ],
    js: [
        'src/background/*.js',
        'src/content-scripts/web-page-canvas.js',
        'src/popup/js/*.js',
    ],
    other: [
        'src/images/*',
        'src/about/about.html',
        'src/web-resources/icons/fonts/*',
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

var debug = function() {
    gulp.src(paths.js)
        .pipe(jshint(package.jshintConfig))
        .pipe(jshint.reporter('default'));
};

var minifyJS = function() {
    gulp.src(paths.js)
        .pipe(uglifyjs())
        .pipe(gulp.dest(destination));
};

var minifyCSS = function() {
    var cssOptions = { uglyComments: true };
    gulp.src(paths.css)
        .pipe(uglifycss(cssOptions))
        .pipe(gulp.dest(destination));
};

var copyOther = function() {
    gulp.src(paths.other)
        .pipe(gulp.dest(destination));
};

gulp.task('debug', debug);

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
gulp.task('default', ['clean', 'debug', 'build']);