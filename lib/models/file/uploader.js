var P = require('bluebird'),
block = require('./block'),
request = require('request'),
util = require('util'),
crypto = require('crypto'),
progress = require('request-progress'),
fs = require('fs'),
Transfer = require('./transfer').Transfer,
_ = require('lodash'),
pathlib = require('path'),
common = require('./common');

var HUGE_FILE_SIZE_MIN = 1 * 1024 * 1024 * 1024;


function Uploader(opts) {
    this.opts = opts;
    this.meta = null;
    this.is_huge = false;
    this.total_size = null;
    this.incrementalSha1 = crypto.createHash('sha1');
    Transfer.call(this, opts);
}

util.inherits(Uploader, Transfer);

Uploader.prototype.get_file_size = function () {
    var _this = this;
    return new P(function (resolve, reject) {
        fs.stat(_this.opts.path, function (error, stat) {
            if (error) {
                reject(error);
            }
            _this.total_size = stat.size;
            _this.meta = {size: stat.size};
            if (_this.total_size >= HUGE_FILE_SIZE_MIN) {
                //_this.is_huge = true;
            }
            resolve();
        });
    });
};

Uploader.prototype.get_file_digest_meta = function () {
    var _this = this;
    return new P(function (resolve, reject) {
        var READ_SIZE = 1 * 1024 * 1024,
        size = _this.total_size,
        fd = fs.openSync(_this.opts.path, 'r'),
        s1 = fs.createReadStream(null, {start: 0,  end: READ_SIZE-1, fd: fd, autoClose: false}),
        hash = crypto.createHash('sha1');

        s1.on('data', function (d) {
                hash.update(d);
        });
        s1.on('error', function (error) {
            reject(error);
        });
        s1.on('end', function() {
                var options = {start: size/2, end: size/2+READ_SIZE-1, fd: fd, autoClose: false};
                var s2 = fs.createReadStream(null, options);
                s2.on('data', function (d) {
                        hash.update(d);
                });
                s2.on('error', function (error) {
                    reject(error);
                });
                s2.on('end', function () {
                        var options = {start: size-READ_SIZE, end: size-1, fd: fd};
                        var s3 = fs.createReadStream(null, options);
                        s3.on('data', function (d) {
                                hash.update(d);
                        });
                        s3.on('error', function (error) {
                            reject(error);
                        });
                        s3.on('end', function () {
                                hash.update(''+size);
                                resolve({rsum: hash.digest('hex'), size: _this.total_size, name: pathlib.basename(_this.opts.path)});
                        });
                });
        });
    });
};

Uploader.prototype.get_file_detail_meta = function () {
    var _this = this;
    return new P(function (resolve, reject) {
            var s = fs.ReadStream(_this.opts.path), shasum = crypto.createHash('sha1'),
            start_time = Date.now();
            _this.logger.debug(util.format('Will Calculating file %s sha1, File size: %d......', _this.opts.path, _this.total_size));
            s.on('data', function(d) { shasum.update(d);  });
            s.on('end', function() {
                    _this.logger.debug(util.format('Calculating file %s sha1, Consuming: %s(sec)', _this.opts.path, (Date.now()-start_time)/1000));
                    resolve({sha1: shasum.digest('hex'), size: _this.total_size, name: pathlib.basename(_this.opts.path)});
            });
            s.on('error', function (error) {
                reject(error);
            });
    });
};

Uploader.prototype.upload_file_to_remote = function () {
    if (this.is_huge) {
        return this.upload_huge_file_to_remote();
    } else {
        return this.upload_normal_file_to_remote();
    }
};

Uploader.prototype.upload_huge_file_to_remote = function () {
    var _this = this;
    return new P(function (resolve, reject) {
        _this.get_file_digest_meta()
        .then(function (meta) {
            _this.meta = _.merge(meta, _this.meta);
            return _this.check_new_file();
        })
        .then(function (data) {
            if (data.more_check === 0) {
                return _this.get_bundles_meta_info()
                    .then(function (upload_bundles_info) {
                        _this.meta.bundles_info = upload_bundles_info;
                        return _this.create_new_file();
                    });
            } else {
                    _this.get_bundles_meta_info()
                    .then(function (upload_bundles_info) {
                        _this.meta.bundles_info = upload_bundles_info;
                        return _this.create_new_file();
                    });
            }
        })
        .then(function (data) {
            if (data.code && data.code === 4005) {
                _this.logger.debug(util.format('File xid %s has exists!!!', data.data.xid));
                resolve({code:0, data:[]});
            } else if (data.code && data.code === 4010) {
                return _this.create_exists_file(data.data.xid);
            } else {
                return new P(function (resolve2) {resolve2(data);});
            }
        })
        .then(function (resp) {
            return _this.start_upload_process(resp);
        })
        .then(function (data) {
            resolve(data);
        })
        .catch(function (error) {
            reject(error);
        });
    });
};

Uploader.prototype.upload_normal_file_to_remote = function () {
    var _this = this;
    return new P(function (resolve, reject) {
        _this.get_bundles_meta_info()
        .then(function (upload_bundles_info) {
            _this.meta.bundles_info = upload_bundles_info;
            return _this.create_new_file();
        })
        .then(function (data) {
            if (data.code && data.code === 4005) {
                _this.logger.debug(util.format('File xid %s has exists!!!', data.data.xid));
                resolve({code:0, data:[]});
            } else if (data.code && data.code === 4010) {
                return _this.create_exists_file(data.data.xid);
            } else {
                return new P(function (resolve2) {resolve2(data);});
            }
        })
        .then(function (resp) {
            return _this.start_upload_process(resp);
        })
        .then(function (data) {
            resolve(data);
        })
        .catch(function (error) {
            reject(error);
        });
    });
};

Uploader.prototype.start_upload_process = function (resp) {
    var _this = this;
    return new P(function (resolve, reject) {
        var upload_promise;
        _this.meta.xid = resp.xid;
        _this.meta.file_version = resp.file_version;
        upload_promise = _this.opts.size === 0 ? _this.deal_with_empty_file() : _this.deal_with_non_empty_file();
        return upload_promise
        .then(function () {
            resolve({code: 0, data: []});
        })
        .catch(function (error) {
            reject(error);
        });
    });
};

Uploader.prototype.deal_with_non_empty_file = function () {
    return this.upload_file(this.meta.bundles_info);
};


Uploader.prototype.upload_file = function (bundles_meta_info_arr) {
    var _this = this, confirmed_size = 0;

    function upload_one_block (block_info, retry) {
        var block_upload_info = block_info.info,
        block_meta_info = block_info.meta;

        return new P(function (resolve, reject) {
            common.retry_n_reject({
                op_factory: function () {
                            return block.createBlockStreamReader({
                                skey: _this.opts.skey,
                                kinfo: _this.opts.kinfo,
                                path: _this.opts.path,
                                bid: block_upload_info.i,
                                file_size: _this.meta.file_size,
                                ustream: _this.upload_block(block_upload_info.i, block_upload_info.m, block_upload_info.t)
                            })
                            .then(function (resp) {
                                _this.logger.debug(util.format('Uploading block %d consuming %s(sec)', block_meta_info.i, (Date.now()-resp.request.startTime)/1000));
                                return _this.confirm_block(block_meta_info.i, block_meta_info.w, block_meta_info.s, block_upload_info.t)
                                    .then(function () {
                                        confirmed_size += block_meta_info.z;
                                        var progress = (confirmed_size/_this.meta.file_size) * 100;
                                        _this.logger.info(util.format('Uploading file %s, Total Size: %d, Uploaded block size: %s, Uploaded file Size: %s, Progress %s%%', _this.opts.path, _this.meta.file_size, block_meta_info.z, confirmed_size, progress.toFixed(2)));
                                    })
                                    .catch(function (error) {
                                        if (error.code === 4051) {
                                            resolve(block_meta_info.i);
                                        } else if (error.code === 4014) {
                                            retry = retry === undefined ? 1 : (retry+1);
                                            if (retry >= 16) {
                                                reject(error);
                                            } else {
                                                _this.logger.debug(util.format('Confirm block %d failed, retry: %d', block_meta_info.i, retry));
                                                upload_one_block(block_info, retry);
                                            }
                                        } else {
                                            reject(error);
                                        }
                                    });
                            })
                            .then(function (notCare) {
                                resolve(block_meta_info.i);
                            });
                },
                delay: 100,
                max_retry: 16
            })
            .catch(function (error) {
                retry = retry === undefined ? 1 : (retry +1);
                _this.logger.debug(util.format('Uploading block %d failed, retry: %d', block_meta_info.i, retry));
                if (retry >= 5) {
                    reject(error);
                } else {
                    upload_one_block(block_info, retry)
                        .then(function () {
                            resolve(block_meta_info.i);
                        })
                        .catch(function (error) {
                            reject(error);
                        });
                }
            });
        });
    }

    function upload_blocks_in_bundle (bundles_upload_info, bundles_meta_info) {
        var partitioned_upload_args, upload_args = [];
        _.map(bundles_upload_info, function (block_upload_info) {
            var block_meta_info = _.find(bundles_meta_info, function (item) {
                return item.i === block_upload_info.i;
            });
            upload_args.push({meta: block_meta_info, info: block_upload_info});
        });
        partitioned_upload_args = _.chunk(upload_args, 1);
        return P.each(partitioned_upload_args, function (blocks_arr) {
            return P.all(_.map(blocks_arr, upload_one_block));
        });
    }

    return P.each(bundles_meta_info_arr, function (bundles_meta_info) {
            return new P( function (resolve, reject) {
                _this.diff_bundle(bundles_meta_info)
                .then(function (data) {
                    if (data.code === undefined) {
                        return upload_blocks_in_bundle(data.bundle, bundles_meta_info);
                    } else { // block exists 4006
                        resolve();
                    }
                })
                .then(function () {
                    resolve();
                })
                .catch(function (error) {
                    _this.logger.error('Unknown error happend in uploading bundle', error);
                    reject(error);
                });
            });
        })
        .then(function () {
            return _this.commit_file();
        })
        .then(function (not_commited_blocks) {
            if (_.isArray(not_commited_blocks) && not_commited_blocks.length === 0) {
                _this.logger.info(util.format('Upload file %s completed, Total Size: %d', _this.opts.path, _this.meta.file_size));
                return new P(function (resolve, reject) { resolve(); });
            } else if (not_commited_blocks.committed !== undefined) {
                _this.logger.info(util.format('Upload file %s completed, Total Size: %d', _this.opts.path, _this.meta.file_size));
                return new P(function (resolve, reject) { resolve(); });
            } else {
                return _this.rollback_file();
            }
        });
};

Uploader.prototype.deal_with_empty_file = function () {
    return new P(function (resolve, reject) {
        _this.commit_file()
        .then(function (data) {
            resolve(data);
        })
        .catch(function (error) {
            _this.rollback_file()
            .catch(function (error) {
                reject(error);
            });
        });
    });
};

Uploader.prototype.get_bundles_meta_info = function () {
    var _this = this;
    return new P(function (resolve, reject) {
        var total_bundle, upload_bundles_info_arr = [], start_time = Date.now();
        _this.logger.debug(util.format('Will Calculating file %s sha1, File size: %d......', _this.opts.path, _this.total_size));
        new block.BundleReader({path: _this.opts.path, skey: _this.opts.skey, kinfo: _this.opts.kinfo, incrementalSha1: _this.incrementalSha1})
        .on('start', function (ctotal, btotal, file_size) {
            total_bundle = ctotal;
            _this.meta.block_max = Math.max(btotal-1, 0);
            _this.meta.file_size = file_size;
        })
        .on('bundle', function (upload_bundles_info) {
            if (upload_bundles_info.length !== 0) {
                var bids =  _.map(upload_bundles_info, 'i');
                _this.logger.debug(util.format('Calculating File %s blocks %s sha1', _this.opts.path, bids));
                upload_bundles_info_arr.push(upload_bundles_info);
            }
        })
        .on('end', function () {
            _this.meta.sha1 = _this.incrementalSha1.digest('hex');
            _this.meta.name = pathlib.basename(_this.opts.path);
            _this.logger.debug(util.format('Calculating file %s sha1, File size: %d, Consuming: %s(sec)', _this.opts.path, _this.total_size, (Date.now()-start_time)/1000));
            resolve(upload_bundles_info_arr);
        })
        .read();
    });
};

Uploader.prototype.check_new_file = function () {
    if (this.is_huge) {
        return this.delegation.delegate('XfileFileHugeUploadCheckV1', {
            xid: this.opts.xid,
            rsum: this.meta.rsum,
        }, true, function (error) {
            if (error.code === 4010 || error.code === 4005) {
                return null;
            } else {
                return true;
            }
        });
    } else {
        return new P(function (resolve, reject) {resolve({more_check: 1});});
    }
};

Uploader.prototype.create_new_file = function () {
    if (this.is_huge) {
        return this.delegation.delegate('XfileFileHugeUploadCreateV1', {
            xid: this.opts.xid,
            name: this.meta.name,
            size: this.meta.size,
            sha1: this.meta.sha1,
            rsum: this.meta.rsum,
            blockInfo: JSON.stringify([])
        }, true, function (error) {
            if (error.code === 4010 || error.code === 4005) {
                return null;
            } else {
                return true;
            }
        });
    } else {
        return this.delegation.delegate('XfileFileUploadCreateV2', {
            xid: this.opts.xid,
            name: this.meta.name,
            size: this.meta.size,
            sha1: this.meta.sha1
        }, true, function (error) {
            if (error.code === 4010 || error.code === 4005) {
                return null;
            } else {
                return true;
            }
        });
    }
};

Uploader.prototype.create_exists_file = function (xid) {
    if (this.is_huge) {
        return this.delegation.delegate('XfileFileHugeUploadExistsV1', {
            xid: xid,
            size: this.meta.size,
            sha1: this.meta.sha1
        });
    } else {
        return this.delegation.delegate('XfileFileUploadExistsV2', {
            xid: xid,
            size: this.meta.size,
            sha1: this.meta.sha1
        });
    }
};

Uploader.prototype.diff_bundle = function (bundles_info) {
    if (this.is_huge) {
        return this.delegation.delegate('XfileFileHugeUploadDiffV1', {
            xid: this.meta.xid,
            fileVer: this.meta.file_version,
            blockInfo: JSON.stringify(bundles_info)
        }, true, function (error) {
            if (error.code === 4006) {
                return null;
            } else {
                return true;
            }
        });
    } else {
        return this.delegation.delegate('XfileFileUploadDiffV2', {
            xid: this.meta.xid,
            fileVer: this.meta.file_version,
            blockInfo: JSON.stringify(bundles_info)
        }, true, function (error) {
            if (error.code === 4006) {
                return null;
            } else {
                return true;
            }
        });
    }
};

Uploader.prototype.confirm_block = function (bid, weak, strong, stub) {
    if (this.is_huge) {
        return this.delegation.delegate('XfileFileHugeBlockUploadConfirmV1', {
            xid: this.meta.xid,
            fileVer: this.meta.file_version,
            bid: bid,
            weak: weak,
            strong: strong,
            stub: stub
        }, true, function (error) {
            if (error.code === 4051 || error.code === 4014) {
                return false;
            } else {
                return true;
            }
        });
    } else {
        return this.delegation.delegate('XfileFileBlockUploadConfirmV2', {
            xid: this.meta.xid,
            fileVer: this.meta.file_version,
            bid: bid,
            weak: weak,
            strong: strong,
            stub: stub
        }, true, function (error) {
            if (error.code === 4051 || error.code === 4014) {
                return false;
            } else {
                return true;
            }
        });
    }
};

Uploader.prototype.commit_file = function () {
    if (this.is_huge) {
        return this.delegation.delegate('XfileFileHugeUploadCommitV1', {
            xid: this.meta.xid,
            fileVer: this.meta.file_version,
            sha1: this.meta.sha1,
            blockMax: this.meta.block_max
        });
    } else {
        return this.delegation.delegate('XfileFileUploadCommitV2', {
            xid: this.meta.xid,
            fileVer: this.meta.file_version,
            blockMax: this.meta.block_max
        });
    }
};

Uploader.prototype.rollback_file = function () {
    var _this = this;
    return this.delegation.delegate('XfileFileUploadRollbackV2', {
        xid: this.meta.xid,
        fileVer: this.meta.file_version
    }, true, function (error) {
        if (error.code === 4004) {
            return false;
        } else {
            return true;
        }
    })
    .then(function () {
        _this.logger.debug(util.format("the file %s is rollback, will retry again, don't worry, uploaded blocks will not upload again", _this.opts.path));
        throw new Error("File has rollback");
    })
    .catch(function () {
        _this.logger.debug(util.format("the file %s is rollback, will retry again, don't worry, uploaded blocks will not upload again", _this.opts.path));
        throw new Error("File has rollback");
    });
};

Uploader.prototype.upload_block = function (bid, headers, stub) {
    var _this = this, url = _this.delegation.connection.locations.block_upload_url + stub;
    _this.logger.debug(util.format('uploading to url %s', url), headers);
    return progress(request({
            url : url,
            method: 'PUT',
            headers: headers,
            pool: {maxSockets: 2048},
            agent: false,
            time: true
        }))
    .on('progress', function (state) {
        if (_this.opts.progress) {
            _this.opts.progress(state);
        }
    });
};

Uploader.prototype.begin = function () {
    var _this = this;
    return new P(function (resolve, reject) {
        return _this.shake_hand()
        .then(function () {
            return _this.get_file_size();
        })
        .then(function () {
            return _this.upload_file_to_remote();
        })
        .then(function () {
            resolve();
        })
        .catch(function (error) {
            reject(error);
        });
    });
};

module.exports = Uploader;
