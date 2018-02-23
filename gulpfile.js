var path = require('path');
var gulp = require('gulp');
var eslint = require('gulp-eslint');
var jshint = require('gulp-jshint');
var checkStyleReporter = require('jshint-checkstyle-file-reporter');
var excludeGitignore = require('gulp-exclude-gitignore');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var nsp = require('gulp-nsp');
var plumber = require('gulp-plumber');
var babel = require('gulp-babel');
var del = require('del');
var isparta = require('isparta');
var jsdoc = require('gulp-jsdoc3');
var coveralls = require('gulp-coveralls');

// Initialize the babel transpiler so ES2015 files gets compiled
// when they're loaded
require('babel-core/register');

process.env.JSHINT_CHECKSTYLE_FILE = '.jshint.xml';

// gulp.task('static', function () {
//   return gulp.src('**/*.js')
//     .pipe(excludeGitignore())
//     .pipe(eslint())
//     .pipe(eslint.format())
//     .pipe(eslint.failAfterError());
// });


gulp.task('doc', function (cb) {
    var config = {
        opts: {
            destination: './docs/gen',
            tutorials: './docs/tutorials'
        }
    };
    gulp.src(['README.md', './lib/**/*.js'], {read: false})
        .pipe(jsdoc(config, cb));
});


gulp.task('lint', function() {
    return gulp.src('./lib/*.js')
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter(checkStyleReporter))
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('nsp', function (cb) {
  nsp({package: path.resolve('package.json')}, cb);
});

gulp.task('pre-test', function () {
  return gulp.src('lib/**/*.js')
    .pipe(istanbul({
      includeUntested: true,
      instrumenter: isparta.Instrumenter
    }))
    .pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], function (cb) {
  var mochaErr;

  gulp.src('test/**/*.js')
    .pipe(plumber())
    .pipe(mocha({reporter: 'spec'}))
    .on('error', function (err) {
      mochaErr = err;
    })
    .pipe(istanbul.writeReports())
    .on('end', function () {
      cb(mochaErr);
    });
});

gulp.task('coveralls', ['test'], function () {
  if (!process.env.CI) {
    return;
  }

  return gulp.src(path.join(__dirname, 'coverage/lcov.info'))
    .pipe(coveralls());
});

gulp.task('babel', ['clean'], function () {
  return gulp.src('lib/**/*.js')
    .pipe(babel())
    .pipe(gulp.dest('dist'));
});

gulp.task('clean', function () {
  return del('dist');
});

//gulp.task('prepublish', ['nsp', 'babel']);
gulp.task('prepublish', ['lint', 'babel']);
gulp.task('default', ['lint', 'test', 'coveralls']);
