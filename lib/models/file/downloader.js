var P = require('bluebird'),
fs = require('fs'),
http = require('http'),
request = require('request'),
progress = require('request-progress'),
tmp = require('tmp'),
crypto = require('crypto'),
Transfer = require('./transfer').Transfer,
concat = require('stream-concat-files'),
_ = require('lodash'),
util = require('util'),
block = require('./block'),
common = require('./common');

BLOCK_SIZE = 4 * 1024 * 1024;
http.globalAgent.maxSockets = 10240;

function Downloader(opts) {
    var block_num = parseInt(opts.size / BLOCK_SIZE);
    this.opts = opts;
    this.opts.finished_size = 0;
    this.opts.fragment_size = opts.size % BLOCK_SIZE;
    this.opts.last_bid = this.opts.fragment_size === 0 ? block_num-1 : block_num;
    this.meta = null;
    Transfer.call(this, opts);
}

util.inherits(Downloader, Transfer);

Downloader.prototype.prepare_file =  function () {
    return this.delegation.delegate('XfileFileDownloadPrepareV2', {
        xid: this.opts.xid,
        fileVer: this.opts.file_version
    }, true, function (error) {
        if (error.code && error.code === 4004) {
            return false;
        }
    });
};

Downloader.prototype.diff_bundle =  function (bids) {
    return this.delegation.delegate('XfileFileDownloadDiffV2', {
        xid: this.meta.xid,
        fileVer: this.meta.file_version,
        bids: JSON.stringify(bids)
    });
};

Downloader.prototype.download_block = function (bid, headers, stub) {
    var _this = this,
    url = _this.delegation.connection.locations.block_download_url + stub;
    return progress(request(url, {
            method: 'GET',
            headers: headers,
        }))
    .on('progress', function (state) {
        var elapsed = state.time.elapsed === 0 ? 0.001 : state.time.elapsed, speed, block_size, download_size;

        block_size = bid === _this.opts.last_bid ? _this.opts.fragment_size : BLOCK_SIZE;
        block_size = block_size === 0 ? BLOCK_SIZE : block_size;
        if (_this.opts.last_bid === bid) {
            _this.opts.finished_size += _this.opts.fragment_size;
        }
        download_size = _this.opts.finished_size;
        speed = block_size/elapsed;

        if (_this.opts.progress) {
            _this.opts.progress({total: _this.opts.size, speed: speed, download_size: download_size});
        }
    })
    .on('response', function (resp) {
        _this.logger.debug('Requesting download block from url: ' + url + ' Response code: ' + resp.statusCode);
    });
};

Downloader.prototype.begin = function () {
    var _this = this;

    function download_bundles_in_sequence(download_info) { // never download bundles by parallel but download blocks in bundles by parallel
        var partitioned_bids = _.chunk(_.range(0, download_info.block_max+1), 16); // partition bids by bundle

        return P.mapSeries(partitioned_bids, function (bids) {
            return _this.diff_bundle(bids)
                .then(function (resp) {
                    var blocks_in_bundle = resp.bundle.slice(0, resp.bundle.length);
                    return P.mapSeries(blocks_in_bundle, function (block_info) { // download blocks in bundle
                        _this.logger.debug('Downloading block id %s......', block_info.i);

                        function download_block_task() {
                            return block.createBlockStreamWriter({
                                    skey: _this.opts.skey,
                                    kinfo: _this.opts.kinfo,
                                    bid: block_info.i,
                                    digest: block_info.s,
                                    path: _this.opts.path,
                                    cache_dir: _this.opts.cache_dir||'./',
                                    sstream: _this.download_block(block_info.i, block_info.m, block_info.t)
                            })
                            .then (function (res) {
                                _this.opts.finished_size += (res.bid === _this.opts.last_bid ? _this.opts.fragment_size : BLOCK_SIZE);
                                return res;
                            });
                        }
                        return common.retry_n_reject({ //download one block
                                operation: download_block_task(),
                                delay: 2000,
                                max_retry: 5,
                                op_factory: function (operation) {
                                    return download_block_task();
                                }
                            });
                    });
                })
                .then(function (data) {
                    return merge_blocks_in_bundle(data);
                });
        });
    }

    function remove_file(path) {
        return new P(function (resolve, reject) {
            fs.unlink(path, function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    function merge_blocks_in_bundle(bid2path_arr) {
        var blocks_all = _.chain(bid2path_arr)
        .sortBy(function (item) { return item.i; })
        .map('path')
        .toArray()
        .value(),
        max_block = _.max(_.map(bid2path_arr, 'bid'));
        return new P(function (resolve, reject) {
            tmp.file({prefix: "kdownload", dir: './'}, function (err, path, fd) {
                P.promisify(concat)(blocks_all, path)
                .then(function () {
                    return P.map(blocks_all, remove_file);
                })
                .then(function () {
                    resolve({max_block: max_block, path: path});
                })
                .catch(function (error) {
                    reject(error);
                });
            });
        });
    }

    function merge_files(bid2path_arr_all) {
        var files_all = _.chain(_.flatten(bid2path_arr_all))
        .sortBy(function (item) { return item.i; })
        .map('path')
        .toArray()
        .value();
        return new P(function (resolve, reject) {
            P.promisify(concat)(files_all, _this.opts.path)
            .then(function () {
                return P.map(files_all, remove_file);
            })
            .then(function () {
                resolve();
            })
            .catch(function (error) {
                reject(error);
            });
        });
    }

    return new P(function (resolve, reject) {
        return _this.shake_hand()
            .then(function () {
                return _this.prepare_file();
            })
            .then(function (download_info) {
                _this.meta = _.merge(_this.meta, {
                    block_max: download_info.block_max,
                    xid: download_info.xid,
                    file_version: download_info.file_version,
                });
                return download_bundles_in_sequence(download_info);
        })
        .then(function (bid2path_arr_all) {
            return merge_files(bid2path_arr_all);
        })
        .then(function () {
            resolve();
        })
        .catch(function (error) {
            reject(error);
        });
    });
};

module.exports = Downloader;
