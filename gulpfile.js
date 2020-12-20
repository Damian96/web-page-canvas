var gulp = require("gulp");
var del = require("del");
var uglifyjs = require("gulp-uglify-es").default;
var uglifycss = require("gulp-uglifycss");
var jshint = require("gulp-jshint");
var package = require("./package");
var sass = require("gulp-sass");
var cssOptions = { uglyComments: true };
var gulpDebug = require('gulp-debug');

var paths = {
  css: ["src/about/*.css", "src/web-resources/css/options.css"],
  sass: ["src/web-resources/sass/*.scss", "src/popup/sass/*.scss"],
  js: [
    "src/background/*.js",
    "src/web-resources/*.js",
    "src/content-scripts/web-page-canvas.js",
    "src/popup/js/*.js",
  ],
  other: [
    "src/about/me.jpg",
    "src/images/*",
    "src/about/about.html",
    "src/web-resources/html/*",
    "src/web-resources/js/*",
    "src/web-resources/webfonts/*",
    'src/icons/css/wpc.css',
    'src/icons/font/*',
    "src/popup/html/*.html",
    "src/*.json",
  ],
};

// Not all tasks need to use streams
// A gulpfile is just another node program and you can use any package available on npm
var clean = function () {
  // You can use multiple globbing patterns as you would with `gulp.src`
  return del(["build/*"]);
};

var destination = function (file) {
  // file.path, file.base
  var result = file.base;

  if (result.indexOf("\\sass") > -1)
    result = result.replace("\\sass", "\\css");

  // dirname = base
  return result.replace("\\src", "\\build");
};

var debug = function () {
  return gulp
    .src(paths.js)
    .pipe(jshint(package.jshintConfig))
    .pipe(jshint.reporter("default"));
};

var minifyJS = function () {
  return gulp.src(paths.js).pipe(uglifyjs()).pipe(gulp.dest(destination));
};

var minifyCSS = function () {
  return gulp
    .src(paths.css)
    .pipe(uglifycss(cssOptions))
    .pipe(gulp.dest(destination));
};

var srcSass = function () {
  return gulp
    .src(paths.sass)
    .pipe(sass().on("error", sass.logError))
    .pipe(
      gulp.dest(function (file) {
        return file.base.replace("sass", "css");
      })
    );
};

var minifySASS = function () {
  return gulp
    .src(paths.sass)
    .pipe(sass().on("error", sass.logError))
    .pipe(uglifycss(cssOptions))
    .pipe(gulpDebug())
    .pipe(gulp.dest(destination));
};

var copyOther = function () {
  return gulp
    .src(paths.other, { allowEmpty: true })
    .pipe(gulp.dest(destination));
};

gulp.task("clean", clean);

gulp.task("debug", debug);

gulp.task("srcSass", srcSass);

gulp.task("minifySASS", minifySASS);
gulp.task("minifyJS", minifyJS);
gulp.task("minifyCSS", minifyCSS);
gulp.task("copyOther", copyOther);

gulp.task(
  "release",
  gulp.series(
    "clean",
    gulp.parallel("minifyCSS", "minifySASS", "minifyJS", "copyOther")
  )
);

gulp.task("watch", function () {
  gulp.watch(paths.js, minifyJS);
  gulp.watch(paths.css, minifyCSS);
  gulp.watch(paths.sass, minifySASS);
});

gulp.task("sass-watch", function () {
  gulp.watch(paths.sass, srcSass);
});

gulp.task("default", gulp.series("clean", "debug"));
