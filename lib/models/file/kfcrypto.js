var crypto = require('crypto'),
fs = require('fs'),
P = require('bluebird'),
through2 = require('through2'),
stream = require('stream');

function hashlib(alg, text) {
    return crypto.createHash(alg).update(text).digest('hex');
}

function md5(text) {
    return hashlib('md5', text);
}

function sha1(text) {
    return hashlib('sha1', text);
}

exports.md5 = md5;
exports.sha1 = sha1;

function KFileBlockCrypto (serverKey) {
    if (0 === 1) {
        this.skey =  serverKey;
        this.iv =  '';
        this.encryptor = crypto.createCipheriv('aes-256-cbc', new Buffer(this._sdecrypt(this.skey)), this.iv);
        this.decryptor = crypto.createDecipheriv('aes-256-cbc', new Buffer(this._sdecrypt(this.skey)), this.iv);
    } else {
        this.encryptor = this.decryptor = {
                update: function (data) {
                    return data;
                },
                final: function () {
                    return new Buffer([]);
                }
            };
    }
}

KFileBlockCrypto.prototype._sdecrypt = function (skey) {
};

KFileBlockCrypto.prototype.encrypt = function (data) {
    return Buffer.concat([
        this.encryptor.update(data),
        this.encryptor.final()
    ]);
};

KFileBlockCrypto.prototype.decrypt = function () {
    return Buffer.concat([
        this.decryptor.update(data),
        this.decryptor.final()
    ]);
};

exports.KFileBlockCrypto = KFileBlockCrypto;

exports.createEncryptStream = function (serverKey) {
    return through2(function (chunk, enc, cb) {
        var err, data;
        if (! this.alg) {
            this.alg = new KFileBlockCrypto(serverKey).encryptor;
        }
        try {
            data = this.alg.update(chunk);
            this.push(data);
        } catch (e) {
            this.alg = null;
            err = e;
        }
        cb(err);
    }, function (cb) {
        var err = null, data;
        try {
            data = this.alg.final();
            this.push(data);
        } catch (e) {
            err = e;
        }
        this.alg = null;
        cb(err);
    });
};

exports.createDecryptStream = function (serverKey) {
    return through2(function (chunk, enc, cb) {
        var err, data;
        if (! this.alg) {
            this.alg = new KFileBlockCrypto(serverKey).decryptor;
        }
        try {
            data = this.alg.update(chunk);
            this.push(data);
        } catch (e) {
            this.alg = null;
            err = e;
        }
        cb(err);
    }, function (cb) {
        var err = null, data;
        try {
            data = this.alg.final();
            this.push(data);
        } catch (e) {
            err = e;
        }
        this.alg = null;
        cb(err);
    });
};

exports.createDigestStream = function (digestCB) {
    return through2(function (chunk, enc, cb) {
        if (!this.sha1) {
            this.sha1 = crypto.createHash('sha1');
            this.datas = [];
        }
        this.sha1.update(chunk);
        this.datas.push(chunk);
        cb();
    }, function (cb) {
        var sha1, err;
        try {
            if (this.sha1) {
                sha1 = this.sha1.digest('hex');
                this.sha1 = null;
                digestCB(sha1);
                this.push(Buffer.concat(this.datas));
                this.datas = null;
            }
        } catch (e) {
            err = e;
        }
        cb(err);
    });
};

