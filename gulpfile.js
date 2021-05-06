const gulp = require('gulp');
const jsoneditor = require('gulp-json-editor');
const zip = require('gulp-zip');
const del = require('del');
const manifest = require('./src/manifest.json');
const gulpMultiProcess = require('gulp-multi-process');
const imagemin = require('gulp-imagemin');

function gulpParallel (...args) {
  return function spawnGulpChildProcess (cb) {
    return gulpMultiProcess(args, cb, true);
  };
}

const browserPlatforms = [
  'firefox',
  'chrome',
  'edge',
  'opera',
  'safari'
];

// copy universal

const copyTaskNames = [];

createCopyTasks('pure_dist', {
  source: './dist/',
  destinations: browserPlatforms.map((platform) => `./builds/${platform}`),
});

function createCopyTasks (label, opts) {
  const copyTaskName = `copy:${label}`;
  copyTask(copyTaskName, opts);
  copyTaskNames.push(copyTaskName);
}

function copyTask (taskName, opts) {
  const source = opts.source;
  const destination = opts.destination;
  const destinations = opts.destinations || [destination];
  const pattern = opts.pattern || '/**/*';
  const devMode = opts.devMode;

  return gulp.task(taskName, function () {
    return performCopy();
  });

  function performCopy () {
    // stream from source
    let stream = gulp.src(source + pattern, { base: source });

    // copy to destinations
    destinations.forEach(function (destination) {
      stream = stream.pipe(gulp.dest(destination));
    });

    return stream;
  }
}

// task generators
function zipTask (target) {
  return () => {
    return gulp.src(`./builds/${target}/**`)
      .pipe(zip(`ext-${target}-${manifest.version}.zip`))
      .pipe(gulp.dest('./builds'));
  };
}


// clean dist
gulp.task('clean', function clean () {
  return del(['./builds/*']);
});

// manifest tinkering
gulp.task('manifest:chrome', function () {
  return gulp.src('./builds/chrome/manifest.json')
    .pipe(jsoneditor(function (json) {
      delete json.applications;
      json.minimum_chrome_version = '58';
      return json;
    }))
    .pipe(gulp.dest('./builds/chrome', { overwrite: true }));
});

gulp.task('manifest:opera', function () {
  return gulp.src('./builds/opera/manifest.json')
    .pipe(jsoneditor(function (json) {
      delete json.applications;
      return json;
    }))
    .pipe(gulp.dest('./builds/opera', { overwrite: true }));
});

gulp.task('manifest:production', function () {
  return gulp.src(browserPlatforms.map((platform) => `./builds/${platform}/manifest.json`), { base: './builds/' })
  // Exclude chromereload script in production:
    .pipe(jsoneditor(function (json) {
      json.background.scripts = json.background.scripts.filter((script) => {
        return !script.includes('chromereload');
      });
      return json;
    }))

    .pipe(gulp.dest('./builds/', { overwrite: true }));
});

gulp.task('optimize:images', function () {
  return gulp.src('./builds/**/images/**', { base: './builds/' })
    .pipe(imagemin())
    .pipe(gulp.dest('./builds/', { overwrite: true }));
});

gulp.task('delete:development', function () {
  return del(
    browserPlatforms.map((platform) => `./builds/${platform}/livereload.js`)
      .concat(browserPlatforms.map((platform) => `./builds/${platform}/chromereload.js`))
      .concat(browserPlatforms.map((platform) => `./builds/${platform}/*.css.map`))
  );
});

gulp.task('copy',
  gulp.series(
    gulp.parallel(...copyTaskNames),
    'manifest:production',
    'manifest:chrome',
    'manifest:opera'
  )
);

// zip tasks for distribution
gulp.task('zip:chrome', zipTask('chrome'));
gulp.task('zip:firefox', zipTask('firefox'));
gulp.task('zip:opera', zipTask('opera'));
gulp.task('zip:edge', zipTask('edge'));
gulp.task('zip', gulp.parallel('zip:chrome', 'zip:firefox', 'zip:opera', 'zip:edge'));

// high level tasks
gulp.task('build',
  gulp.series(
    'clean',
    'copy',
    'optimize:images',
    'delete:development',
    'zip'
  )
);
