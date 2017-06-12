var fs = require('fs'),
P  = require('bluebird'),
async = require('async'),
tmp = require('tmp'),
util = require('util'),
EventEmitter = require('events').EventEmitter,
kfcrypto = require('./kfcrypto');

var BLOCK_SIZE = 4 * 1024 * 1024;

function FileBlockReader(opts) {
    this.opts = opts;
    EventEmitter.call(this);
}

util.inherits(FileBlockReader, EventEmitter);

FileBlockReader.prototype.read = function () {
    var start = this.opts.start, end = this.opts.end,
        _this = this;

    function read_block(fd, length, pos, callback) {
        var buffer = new Buffer(length);
        fs.read(fd, buffer, 0, length, pos, function (err, bytesRead) {
            callback(null, bytesRead, buffer);
        });
    }

    fs.open(this.opts.path, 'r', function (err, fd) {
        fs.fstat(fd, function (err, stat) {
            var read_pos, read_max, block_id,
                read_size = 0,
                left_size = (stat.size - Math.floor(stat.size/BLOCK_SIZE)*BLOCK_SIZE),
                block_max=Math.floor(stat.size/BLOCK_SIZE),
                block_total=Math.ceil(stat.size/BLOCK_SIZE);

            if (start === undefined) {
                block_id = read_pos = 0;
            } else {
                block_id = start;
                read_pos = Math.min(start * BLOCK_SIZE, stat.size);
            }

            if (end === undefined) {
                read_max = (block_max-block_id)*BLOCK_SIZE + left_size;
            } else if (end === block_total) {
                read_max = (end-block_id-1)*BLOCK_SIZE + left_size;
            } else {
                read_max = (end-block_id-1)*BLOCK_SIZE;
            }

            _this.emit('start', block_total, stat.size);
            async.whilst(
                function () { return read_size < read_max; },
                function (callback) {
                    var length = Math.min(BLOCK_SIZE, read_max-read_size);
                    if (length !== 0) {
                        read_block(fd, length, read_pos, function (err, nbytes, buffer) {
                            read_size += nbytes;
                            read_pos += nbytes;
                            _this.emit('block', block_id, nbytes, buffer);
                            block_id ++;
                            callback(null);
                        });
                    } else {
                        callback(null);
                    }
                },
                function (err, n) {
                    _this.emit('end');
                }
            );
        });
    });
};

function FileBundleReader(opts) {
    this.opts = opts;
    this.blockReader = new FileBlockReader(opts);
    this.bundle_size = 16;
    EventEmitter.call(this);
}

util.inherits(FileBundleReader, EventEmitter);

FileBundleReader.prototype.read = function () {
    var counter = 1;
    var bundle_info = [];
    var _this = this;
    this.blockReader.on('start', function (btotal, file_size) {
        _this.emit('start', Math.ceil(btotal/_this.bundle_size), btotal, file_size);
    });
    this.blockReader.on('block', function (bid, bsize, bdata) {
        var encryptor = new kfcrypto.KFileBlockCrypto(),
        enc_data = encryptor.encrypt(bdata);

        bundle_info.push({'i': bid, 'w': kfcrypto.md5(enc_data), 's': kfcrypto.sha1(enc_data), 'z': enc_data.byteLength});
        if (counter === _this.bundle_size) {
            _this.emit('bundle', bundle_info);
            counter = 1;
            bundle_info = [];
        } else {
            counter ++;
        }
    });
    this.blockReader.on('end', function () {
        _this.emit('bundle', bundle_info);
        _this.emit('end');
    });
    this.blockReader.read();
};

function createBlockStreamReader(opts) {
    var start = opts.bid * BLOCK_SIZE,
        end = Math.min((opts.bid+1) * BLOCK_SIZE - 1 , opts.file_size);
    return new P (function (resolve, reject) {
            var result = {bid: opts.bid},
            sstream = fs.createReadStream(opts.path, {start: start, end: end})
            .on('error', function (error) { reject(error); }),
            cstream = kfcrypto.createEncryptStream(opts.serverKey)
            .on('error', function (error) { reject(error); });

            sstream
            .pipe(cstream)
            .pipe(opts.ustream)
            .on('error', function (error) {
                reject(error);
            })
            .on('response', function (resp) {
                resolve();
            });
        });
}

function createBlockStreamWriter(opts) {
    return new P (function (resolve, reject) {
        tmp.file({prefix: "kdownload", dir: './'}, function (err, path, fd) {
            var digest,
            fstream = new fs.createWriteStream(null, {fd: fd})
            .on('error', function (error) { reject(error); }),
            dstream = kfcrypto.createDigestStream(function (resultDigest) {
                digest = resultDigest;
            })
            .on('error', function (error) { reject(error); }),
            cstream = kfcrypto.createDecryptStream(opts.serverKey)
            .on('error', function (error) { reject(error); });

            try {
                opts.sstream
                .on('error', function (error) {
                    reject(error);
                })
                .pipe(dstream)
                .pipe(cstream)
                .pipe(fstream)
                .on('finish', function () {
                    if (digest !== opts.digest) {
                        reject(new Error());
                    } else {
                        resolve({bid: opts.bid, path: path});
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    });
}

exports.BundleReader = FileBundleReader;
exports.createBlockStreamReader = createBlockStreamReader;
exports.createBlockStreamWriter = createBlockStreamWriter;
