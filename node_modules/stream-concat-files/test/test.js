/*global describe,it*/
/*jshint expr:true*/

'use strict';

var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var expect = require('chai').expect;
var concatFiles = require('..');

describe('concatFiles', function () {
  // Ensure test output directory is empty
  var outputDir =  path.join(__dirname, 'output');
  if (fs.existsSync(outputDir))
    rimraf.sync(outputDir);
  mkdirp.sync(outputDir);

  // Prepare lists of filenames and expected result
  var inputFiles = ['d', 'b', 'c', 'a'].map(function (x) {
    return path.join(__dirname, 'fixtures', x + '.txt');
  });
  var dodgyInputFiles = ['d', 'b', 'NONEXISTENTFILE', 'c', 'a'].map(function (x) {
    return path.join(__dirname, 'fixtures', x + '.txt');
  });
  var expectedResult = 'four!\ntwo!\nthree!\none!\n';


  describe('filename passed in as target', function() {
    it('works when all source files exist', function (done) {
      var target = path.join(outputDir, 'basic.txt');

      concatFiles(inputFiles, target, function (err) {
        expect(err).to.not.exist;
        expect(fs.readFileSync(target).toString()).to.equal(expectedResult);
        done();
      });
    });

    it('throws an error if any source files are missing', function (done) {
      var target = path.join(outputDir, 'missing-files.txt');
      concatFiles(dodgyInputFiles, target, function (err) {
        expect(err).to.exist;
        expect(function () { throw err; }).to.throw(/ENOENT.+NONEXISTENTFILE/);
        done();
      });
    });


  });


  describe('writable stream passed in as target', function () {
    it('works when all source files exist', function (done) {
      var targetFilePath = path.join(outputDir, 'custom-wr.txt');
      if (fs.existsSync(targetFilePath))
        fs.unlinkSync(targetFilePath);

      var wr = fs.createWriteStream(targetFilePath);
      concatFiles(inputFiles, wr, function (err) {
        expect(err).to.not.exist;
        expect(wr._writableState.finished).to.equal(true);
        expect(fs.readFileSync(targetFilePath).toString()).to.equal(expectedResult);
        done();
      });
    });

    it('errors when a source file is missing', function (done) {
      var targetFilePath = path.join(outputDir, 'custom-wr--missingfiles.txt');
      if (fs.existsSync(targetFilePath))
        fs.unlinkSync(targetFilePath);

      var wr = fs.createWriteStream(targetFilePath);
      concatFiles(dodgyInputFiles, wr, function (err) {
        expect(err).to.exist;
        expect(function () { throw err; }).to.throw(/ENOENT.+NONEXISTENTFILE/);
        done();
      });
    });

    it('works with {end:false}', function (done) {
      var targetFilePath = path.join(outputDir, 'custom-wr--endfalse.txt');
      if (fs.existsSync(targetFilePath))
        fs.unlinkSync(targetFilePath);

      var wr = fs.createWriteStream(targetFilePath);
      concatFiles(inputFiles, wr, {end: false}, function (err) {
        expect(err).to.not.exist;
        expect(wr._writableState.finished).to.equal(false);
        wr.end(function () {
          expect(wr._writableState.finished).to.equal(true);
          expect(fs.readFileSync(targetFilePath).toString()).to.equal(expectedResult);
          done();
        });
      });
    });
  });
});
