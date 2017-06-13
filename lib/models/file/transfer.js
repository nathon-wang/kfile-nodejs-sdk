var P = require('bluebird'),
    crypto = require('crypto');

function Transfer(opts) {
    this.delegation = opts.delegation;
    this.logger = opts.delegation.connection.logger;
    this.opts.clientKey = crypto.createHash('md5').update(Math.random().toString(36)).digest('hex');
    this.opts.clientTime = Math.floor(Date.now() / 1000);
}

Transfer.prototype.shake_hand =  function () {
    var _this = this;
    return this.delegation.delegate('XfileFileTransferShakehandV2', {
        xid: this.opts.xid,
        clientKey: this.opts.clientKey,
        clientTime: this.opts.clientTime
    }, true, function (error) {
        if (error.code && error.code === 1105) {
            return null;
        }
    })
    .then(function (data) {
        if (data && data.key) {
            _this.opts.skey = data.key;
            _this.opts.kinfo = {
                clientKey: _this.opts.clientKey,
                clientTime: _this.opts.clientTime,
                xid: _this.opts.xid,
                domain_id: _this.delegation.user.myDomain.domain_id,
                user_xid: _this.delegation.user.myStaff.xid
            };
        }
    });
};

exports.Transfer = Transfer;
