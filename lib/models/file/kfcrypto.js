var crypto = require('crypto'),
fs = require('fs'),
ref = require('ref'),
ffi = require('ffi'),
Struct = require('ref-struct'),
P = require('bluebird'),
pathlib = require('path'),
through2 = require('through2'),
stream = require('stream');

var kstruct = Struct({
    'client_seeder': 'char *',
    'timestamp': 'long',
    'xid': 'longlong',
    'domain_id': 'int',
    'user_xid': 'int'
}),
kstructPtr = ref.refType(kstruct),
libkkgen = ffi.Library('libkkgen', {
    'k_dec_keygen': ['int', ['uchar *', 'uchar *', 'long', 'longlong', 'int', 'int', 'char *']]
});

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

function KFileBlockCrypto (skey, kinfo) {
    if (skey && kinfo) {
        var k =  this._sdecrypt(skey, kinfo);
        this.iv =  'kfile@kingsoft.c';
        this.encryptor = crypto.createCipheriv('aes-256-cbc', new Buffer(k), this.iv);
        this.decryptor = crypto.createDecipheriv('aes-256-cbc', new Buffer(k), this.iv);
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

KFileBlockCrypto.prototype._sdecrypt = function (skey, kinfo) {
    var c_clientSeeder = new Buffer(kinfo.clientKey + '\0', 33), c_skey = new Buffer(skey + '\0', 33);
    var sbuf = new Buffer(33);
    sbuf.fill(0);
    var ret = libkkgen.k_dec_keygen(c_skey, c_clientSeeder, kinfo.clientTime, kinfo.xid, kinfo.domain_id, kinfo.user_xid, sbuf);
    return sbuf.toString('utf-8', 0, ret);
};

KFileBlockCrypto.prototype.encrypt = function (data) {
    return Buffer.concat([
        this.encryptor.update(data),
        this.encryptor.final()
    ]);
};

KFileBlockCrypto.prototype.decrypt = function (data) {
    return Buffer.concat([
        this.decryptor.update(data),
        this.decryptor.final()
    ]);
};

exports.KFileBlockCrypto = KFileBlockCrypto;

exports.createEncryptStream = function (skey, kinfo) {
    return through2(function (chunk, enc, cb) {
        var err, data;
        if (! this.alg) {
            this.alg = new KFileBlockCrypto(skey, kinfo).encryptor;
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

exports.createDecryptStream = function (skey, kinfo) {
    return through2(function (chunk, enc, cb) {
        var err, data;
        if (! this.alg) {
            this.alg = new KFileBlockCrypto(skey, kinfo).decryptor;
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

exports.getDigestInfo = function (file_path) {
    return new P(function (resolve, reject) {
        fs.stat(file_path, function (err, stat) {
            if (err) {
                reject(err);
            } else {
                var s = fs.ReadStream(file_path), shasum = crypto.createHash('sha1');
                s.on('data', function(d) { shasum.update(d);  });
                s.on('end', function() {
                        resolve({sha1: shasum.digest('hex'), size: stat.size, name: pathlib.basename(file_path)});
                });
                s.on('error', function (error) {
                    reject(error);
                });
            }
        });
    });
};


