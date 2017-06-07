var express = require('express'),
timeout = require('connect-timeout'),
kfile = require('../lib/kfile'),
task = require('./task'),
helper = require('./helper');

function login(req, res, debug) {
    var host = req.query.host,
    port = req.query.port || 80,
    ident = req.query.ident,
    pass = req.file.pass,
    user = req.file.user,
    sdk = new kfile.KingFileSDK({host: host, port: port, debug: debug}),
    account = sdk.account(),
    loginedAccount = account.login({domain_ident: ident, login_tag: user, password: pass});

    loginedAccount.then(function (loginedAccount) {
            var info = _.merge(loginedAccount.properties, {host: args.host, port: args.port||80});
            helper.saveLoginInfo(info, function (error) {
            if (error) {
                console.log(error.stack);
                res.status(500);
                res.end();
            } else {
                res.end();
            }
        });
    });
}

function upload(req, res, debug) {
    var xid = req.query.xid,
    local_path = req.file.path;
    task.Upload({debug: debug, id: xid, path: local_path}, function () {
            res.end();
    }, function (error) {
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
