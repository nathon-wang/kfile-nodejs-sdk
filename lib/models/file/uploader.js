var P = require('bluebird'),
block = require('./block'),
request = require('request'),
progress = require('request-progress'),
fs = require('fs'),
_ = require('lodash'),
path = require('path'),
common = require('./common'),
kfcrypto = require('./kfcrypto');

function Uploader(opts) {
    this.delegation = opts.delegation;
    this.opts = opts;
    this.meta = null;
}

Uploader.prototype.get_file_meta = function () {
    var _this = this;
    return new P(function (resolve, reject) {
        var dstream, fstream;
        dstream = kfcrypto.createDigestStream(function (resultDigest) {
            fs.stat(_this.opts.path, function (err, stat) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        sha1: resultDigest,
                        size: stat.size,
                        name: path.basename(_this.opts.path)
                    });
                }
            });
        });
        fstream = fs.createReadStream(_this.opts.path);
        fstream
        .on('error', function (error) {
            reject(error);
        })
        .pipe(dstream)
        .on('error', function (error) {
            reject(error);
        });
    });
};

Uploader.prototype.create_new_file = function () {
    return this.delegation.delegate('XfileFileUploadCreateV2', {
        xid: this.opts.xid,
        name: this.meta.name,
        size: this.meta.size,
        sha1: this.meta.sha1
    }, true, function (error) {
        if (error.code === 4010 || error.code === 4005) {
            return false;
        } else {
            return true;
        }
    });
};

Uploader.prototype.create_exists_file = function (xid) {
    return this.delegation.delegate('XfileFileUploadExistsV2', {
        xid: xid,
        size: this.meta.size,
        sha1: this.meta.sha1
    });
};

Uploader.prototype.diff_bundle = function (bundles_info) {
    return this.delegation.delegate('XfileFileUploadDiffV2', {
        xid: this.meta.xid,
        fileVer: this.meta.file_version,
        blockInfo: JSON.stringify(bundles_info)
    }, true, function (error) {
        if (error.code === 4006) {
            return false;
        } else {
            return true;
        }
    });
};

Uploader.prototype.confirm_block = function (bid, weak, strong, stub) {
    return this.delegation.delegate('XfileFileBlockUploadConfirmV2', {
        xid: this.meta.xid,
        fileVer: this.meta.file_version,
        bid: bid,
        weak: weak,
        strong: strong,
        stub: stub
    });
};

Uploader.prototype.commit_file = function () {
    return this.delegation.delegate('XfileFileUploadCommitV2', {
        xid: this.meta.xid,
        fileVer: this.meta.file_version,
        blockMax: this.meta.block_max
    });
};

Uploader.prototype.rollback_file = function () {
    return this.delegation.delegate('XfileFileUploadRollbackV2', {
        xid: this.meta.xid,
        fileVer: this.meta.file_version
    });
};

Uploader.prototype.upload_block = function (bid, headers, stub) {
    var _this = this, url = _this.delegation.connection.locations.block_upload_url + stub;
    return progress(request(url, {
            method: 'PUT',
            headers: headers,
        }))
    .on('progress', function (state) {
        if (_this.opts.progress) {
            _this.opts.progress(state);
        }
    });
};

Uploader.prototype.begin = function () {
    var _this = this;

    function upload_one_block(block_info) {
        var block_upload_info = block_info.info,
        block_meta_info = block_info.meta;

        return new P(function (resolve, reject) {
            common.retry_n_reject({
                operation: block.createBlockStreamReader({
                            path: _this.opts.path,
                            bid: block_upload_info.i,
                            file_size: _this.meta.file_size,
                            ustream: _this.upload_block(block_upload_info.i, block_upload_info.m, block_upload_info.t)
                        })
                        .then(function () {
                            return _this.confirm_block(block_meta_info.i, block_meta_info.w, block_meta_info.s, block_upload_info.t);
                        })
                        .then(function (notCare) {
                            resolve(block_meta_info.i);
                        }),
                delay: 2000,
                max_retry: 3
            });
        });
    }

    function upload_blocks_in_bundle(bundles_upload_info, bundles_meta_info) {
        var partitioned_upload_args, upload_args = [];
        _.map(bundles_upload_info, function (block_upload_info) {
            var block_meta_info = _.find(bundles_meta_info, function (item) {
                return item.i === block_upload_info.i;
            });
            upload_args.push({meta: block_meta_info, info: block_upload_info});
        });
        partitioned_upload_args = _.values(_.groupBy(upload_args, function (e, idx) { return Math.floor(idx/4); }));
        return P.mapSeries(partitioned_upload_args, function (blocks_arr) {
            return P.all(_.map(blocks_arr, upload_one_block));
        });
    }

    function upload_file(bundles_meta_info_arr) {
        return P.mapSeries(bundles_meta_info_arr, function (bundles_meta_info) {
                return new P( function (resolve, reject) {
                    _this.diff_bundle(bundles_meta_info)
                    .then(function (resp) {
                        return upload_blocks_in_bundle(resp.bundle, bundles_meta_info);
                    })
                    .then(function () {
                        resolve();
                    })
                    .catch(function (error) {
                        if (error.data === undefined) {
                            _this.delegation.logger.error('Unknown error happend in uploading bundle', error);
                            reject(error);
                        } else {
                            if (error.data.code === 4006) { // block exists
                                resolve(null);
                            } else {
                                reject(error);
                            }
                        }
                    });
                });
            })
            .then(function () {
                return _this.commit_file();
            })
            .then(function (not_commited_blocks) {
                if (not_commited_blocks.length === 0) {
                    return new P(function (resolve, reject) { resolve(); });
                } else {
                    return _this.rollback_file();
                }
            });
    }

    function deal_with_empty_file() {
        return new P(function (resolve, reject) {
            _this.commit_file()
            .then(function () {
                resolve();
            })
            .catch(function (error) {
                _this.rollback_file()
                .catch(function (error) {
                    reject(error);
                });
            });
        });
    }

    function deal_with_non_empty_file () {
        return new P(function (resolve, reject) {
            var total_bundle, upload_bundles_info_arr = [];
            new block.BundleReader({path: _this.opts.path})
            .on('start', function (ctotal, btotal, file_size) {
                total_bundle = ctotal;
                _this.meta.block_max = btotal-1;
                _this.meta.file_size = file_size;
            })
            .on('bundle', function (upload_bundles_info) {
                upload_bundles_info_arr.push(upload_bundles_info);
                if (upload_bundles_info_arr.length === total_bundle) {
                    upload_file(upload_bundles_info_arr)
                    .then(function () {
                        resolve();
                    })
                    .catch(function (error) {
                        reject(error);
                    });
                }
            })
            .read();
        });
    }

    function start_upload_process (resolve) {
        return function (resp) {
            var upload_promise;
            _this.meta.xid = resp.xid;
            _this.meta.file_version = resp.file_version;
            upload_promise = _this.opts.size === 0 ? deal_with_empty_file() : deal_with_non_empty_file();
            return upload_promise
            .then(function () {
                resolve({code: 0, data: []});
            });
        };
    }

    return new P(function (resolve, reject) {
        _this.get_file_meta()
        .then(function (meta) {
            _this.meta = meta;
            return _this.create_new_file();
        })
        .then(start_upload_process(resolve))
        .catch(function (error) {
            if (error.code === 4005) { // file is not modified
                reject(error);
            } else if (error.code === 4010){
                _this.create_exists_file(error.data.xid)
                .then(start_upload_process(resolve));
            } else {
                reject(error);
            }
        });
    });
};

module.exports = Uploader;
