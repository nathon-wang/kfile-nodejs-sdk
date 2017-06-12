/*
 * concat-files
 * https://github.com/callumlocke/node-concat-files
 *
 * Copyright (c) 2014
 * Licensed under the MIT license
 */

'use strict';
var fs = require('fs'),
    async = require('async');

var defaults = {
  end: true
};

module.exports = function concatFiles(sourceFiles, target, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = defaults;
  }
  else {
    for (var prop in defaults) {
      if (defaults.hasOwnProperty(prop) && !options.hasOwnProperty(prop))
        options[prop] = defaults[prop];
    }
  }

  // Ensure callback only gets called once
  var cbCalled = false;
  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }

  // Create a bunch of read streams
  var readStreams = [];
  sourceFiles.forEach(function (sourceFile) {
    var rd = fs.createReadStream(sourceFile);
    rd.on('error', done);
    readStreams.push(rd);
  });

  // Prepare target stream
  var wr;
  if (typeof target === 'string') {
    wr = fs.createWriteStream(target);
    wr.on('error', done);
  }
  else {
    wr = target;
  }

  async.waterfall(
    [
      function (next) {
        // Start writing!
        wr.on('error', done);

        async.eachSeries(
          readStreams,
          function (rd, next2) {
            rd.on('end', function () {
              next2();
            });
            rd.pipe(wr, {end: false});
          },

          function () {
            if (options.end) {
              wr.end(function () {
                next();
              });
            }
            else {
              next();
            }
          }
        );
      }
    ],
    function (err) {
      done(err);
    }
  );
};
