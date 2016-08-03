var P = require('bluebird'),
util = require('util'),
request = require('request'),
user = require("./models/user");

function KingFileSDK (opts) {
    this.options = opts;
    this.initialized = false;
    if (this.options.device_id === undefined) {
        this.options.device_id = '123456';
    }
    this.user_agent = 'kingsoft-ecloud-web;' + this.options.device_id + ';' + '0.1.0';
    return this;
}

KingFileSDK.prototype.configure = function () {
    var _this = this;
    return new P(function (resolve, reject) {
        var opts;
        if (!_this.initialized) {
            _this.initialized = true;
            _this.options.web_server_url = util.format("http://%s:%s/platform/config", _this.options.host, _this.options.port);
            request({url: _this.options.web_server_url, method: 'GET'}, function (err, response, body) {
                var wconfig, request_options, scheme;
                console.log(util.format("Requesting api Url: %s, Response: %s", _this.options.web_server_url, body));
                if (!err && response.statusCode == 200) {
                    web_config = JSON.parse(body);
                    if (web_config.code !== 0) {
                        reject(new Error());
                    } else {
                        wconfig = _this.options.platform_config = web_config.data;
                        scheme = wconfig.https === '0' ? 'http' : 'https';
                        _this.options.api_server_info_url = util.format("%s:%s/v2/server/info", scheme, wconfig.api_server);
                        request_options = {
                            url: _this.options.api_server_info_url,
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'User-Agent': _this.user_agent
                            }
                        };
                        request(request_options, function (err, response, body) {
                            console.log(util.format("Requesting api Url: %s, Response: %s", _this.options.api_server_info_url, body));
                            if (!err && response.statusCode == 200) {
                                api_config = JSON.parse(body);
                                if (api_config.code !== 0) {
                                    reject(new Error());
                                } else {
                                    _this.options.api_server_info = api_config.data;
                                    resolve(_this.options);
                                }
                            } else {
                                reject(err);
                            }
                        });
                    }
                } else {
                    reject(err);
                }
            });
        } else {
            if (!_this.api_server_info) {
                reject(new Error());
            } else {
                resolve(_this.options);
            }
        }
    });
};

KingFileSDK.prototype.reconfigure = function () {
    var api_server_info = this.options.api_server_info;
    this.locations = {
        common_url: api_server_info.common.host + ':' + api_server_info.common.port,
        block_download_url: api_server_info.block.download.host + ':' +  api_server_info.block.download.port + api_server_info.block.download.path,
        block_upload_url: api_server_info.block.upload.host + ':' + api_server_info.block.upload.port + api_server_info.block.upload.path
    };
};

KingFileSDK.prototype.account = function () {
    return new user.Account(this);
};

exports.KingFileSDK = KingFileSDK;
