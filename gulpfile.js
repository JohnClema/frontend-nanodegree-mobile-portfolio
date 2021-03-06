var gulp = require('gulp');

var ghPages = require('gulp-gh-pages');

// Serving through ngrok tunnel
var ngrok     = require('ngrok');
var psi       = require('psi');
var sequence  = require('run-sequence');
var site      = '';
var portVal   = 8080;
var browserSync = require('browser-sync');

//DOM Optimisation packages
var rename = require('gulp-rename');

var cssmin    = require('gulp-cssmin');
var uncss = require('gulp-uncss');

var htmlmin   = require('gulp-htmlmin');
var imagemin = require('gulp-imagemin');
var imageResize = require('gulp-image-resize');
var inline    = require('gulp-inline');
var minline   = require('gulp-minify-inline');
var uglify    = require('gulp-uglify');
var inlineCss = require('gulp-inline-css');

gulp.task('default', function() {
    return gulp.src('./*.html')
        .pipe(gulp.dest('build/'));
});

// var gzip    = require('gulp-gzip');
// var webp    = require('gulp-webp');

//Mapping of the folders
var config = {
  "build": "dist",
  "source": "src",
  "images": {
    "source": "/img/*",
    "target": "/img",
    "views": "images/"
  },
  "css": {
    "source": "/css/*",
    "target": "/css"
  },
  "js": {
    "source": "/js/*",
    "target": "/js"
  },
  "html": {
    "source": "/*.html",
    "target": "/"
  },
  "views": {
    "images": {
      "source": "/views/images/*",
      "target": "/views/images"
    },
    "html": {
      "source": "/views/*.html",
      "target": "/views"
    },
    "css": {
      "source": "/views/css/*",
      "target": "/views/css"
    },
    "js": {
      "source": "/views/js/*",
      "target": "/views/js"
    }
  }
};

//Optimisations for the main folder
gulp.task('css', function () {
  return gulp.src(config.source + config.css.source)
  .pipe(cssmin())
  .pipe(gulp.dest(config.build + config.css.target));
});

gulp.task('html', function () {
  return gulp.src(config.source + config.html.source)
  .pipe(inlineCss())
  // .pipe(uncss({ html: [config.source + '*.html']}))
  .pipe(htmlmin({collapseWhitespace: true}))
  .pipe(gulp.dest(config.build + config.html.target));
});

gulp.task('js', function () {
  return gulp.src(config.source + config.js.source)
  .pipe(uglify())
  .pipe(gulp.dest(config.build + config.js.target));
});

gulp.task('img', function() {
  return gulp.src(config.source + config.images.source)
  .pipe(imagemin({
    progressive: true,
  }))
  .pipe(gulp.dest(config.build + config.images.target));
});

//Optimisations for the pizza views
gulp.task('views-css', function () {
  return gulp.src(config.source + config.views.css.source)
  .pipe(cssmin())
  .pipe(gulp.dest(config.build + config.views.css.target));
});

gulp.task('views-html', function () {
  return gulp.src(config.source + config.views.html.source)
    .pipe(inline({ base: 'views/'}))
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(minline())
  .pipe(gulp.dest(config.build + config.views.html.target));
});

gulp.task('views-js', function () {
  return gulp.src(config.source + config.views.js.source)
  .pipe(uglify())
  .pipe(gulp.dest(config.build + config.views.js.target));
});

gulp.task('views-img', function() {
  return gulp.src(config.source + config.views.images.source)
    .pipe(imagemin({
      progressive: true,
    }))
  .pipe(gulp.dest(config.build + config.views.images.target));
});
gulp.task('resize-pizzeria-image', function () {
  return gulp.src(config.source + config.views.images.target + '/pizzeria.jpg')
    .pipe(imageResize({
      width : 100
    }))
    .pipe(gulp.dest(config.build + config.views.images.target + ''));
});
gulp.task('resize-pizza-image', function () {
  return gulp.src(config.source + config.views.images.target + '/pizza.png')
    .pipe(imageResize({
      width : 74
    }))
    .pipe(rename(config.build + config.views.images.target + '/pizza-small.png'))
    .pipe(gulp.dest('./'));
});

//DOM Optimisation task
// gulp.task('optimisation', []);
gulp.task('optimisation-seq', function (cb) {
  return sequence(
    'html',
    'css',
    'js',
    'img',
    'views-css',
    'views-html',
    'views-js',
    'views-img',
    'resize-pizzeria-image',
    'resize-pizza-image',
    cb
  );
});


// Server task that runs optimisations
gulp.task('browser-sync-psi', ['optimisation-seq'], function() {
  browserSync({
    port: portVal,
    open: false,
    server: {
      baseDir: 'dist'
    }
  });
});

gulp.task('ngrok-url', function(cb) {
  return ngrok.connect(portVal, function (err, url) {
    site = url;
    console.log('serving your tunnel from: ' + site);
    cb();
  });
});


gulp.task('psi-mobile', function () {
    return psi.output(site, {
        // key: key
        nokey: 'true',
        strategy: 'mobile',
    });
});

gulp.task('psi-desktop', function () {
    return psi.output(site, {
        nokey: 'true',
        // key: key,
        strategy: 'desktop',
    });
});

// Run browser sync, send it to the ngrok url, run pagespeed insights on that url
gulp.task('psi-seq', function (cb) {
  return sequence(
    'browser-sync-psi',
    'ngrok-url',
    'psi-desktop',
    'psi-mobile',
    cb
  );
});

// psi task runs and exits
gulp.task('psi', ['psi-seq'], function() {
  console.log('Woohoo! Check out your page speed scores!');
  process.exit();
});

gulp.task('deploy', function() {
  return gulp.src('./dist/**/*')
    .pipe(ghPages());
});
