var express = require('express'),
timeout = require('connect-timeout'),
_ = require('lodash'),
kfile = require('../lib/kfile'),
task = require('./task'),
helper = require('./helper');

function login(req, res, debug) {
    var host = req.query.host,
    port = req.query.port || 80,
    ident = req.query.ident,
    pass = req.query.pass,
    user = req.query.user;
    task.Login({host: host, port: port, ident: ident, pass: pass, user: user, debug: debug}, function (info) {
        res.end(JSON.stringify(info));
    }, function (error) {
        console.error(error.stack);
        res.status(500);
        res.end();
    });
}

function upload(req, res, debug) {
    var xid = req.query.xid,
    local_path = req.query.path;
    task.Upload({debug: debug, id: xid, target: local_path}, function () {
            res.end();
    }, function (error) {
            console.error(error.stack);
            res.status(500);
            res.end();
    });
}

function download(req, res, debug) {
    var xid = req.query.xid,
    file_version = req.query.fileVer;
    task.Download({debug: debug, id: xid, version: file_version}, function () {
            res.end();
    }, function (error) {
            console.error(error.stack);
            res.status(500);
            res.end();
    });
}

function App (options) {
    var _this = this;
    this.options = options;
    function haltOnTimedout(req, res, next){
          if (!req.timedout) {
              next();
          } else {
              res.status(502).end();
          }
    }
    this.app = express();
    this.app.post('/kfile/login', function (req, res) {
        login(req, res, _this.options.debug);
    });
    this.app.post('/kfile/file/upload', function (req, res) {
        upload(req, res, _this.options.debug);
    });
    this.app.get('/kfile/file/download', timeout('3600s'), haltOnTimedout, function (req, res) {
        download(req, res, _this.options.debug);
    });
}

App.prototype.start = function () {
    console.log('Kingfile Local Proxy Service listening @ ', this.options.port, this.options.debug ? ' in debug mode': '');
    this.app.listen(this.options.port);
};

exports.App = App;
