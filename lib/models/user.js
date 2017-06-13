var P = require('bluebird'),
util = require('util'),
KObject = require('./base').KObject,
organization = require('./organization'),
xfile = require('./xfile');

function Account(connection) {
    KObject.call(this, connection);
    this.login_info = null;
}

util.inherits(Account, KObject);

Account.prototype.login = function (opts) {
    var _this = this;
    return new P(function (resolve, reject) {
        return _this.connection.configure()
            .then(function (options) {
                _this.connection.reconfigure();
                if (opts.token) {
                    _this.login_info = {token: opts.token};
                    _this.connection.token = _this.login_info.token;
                    _this.delegate('AccountInfoV1')
                    .then(function (user_info) {
                        resolve(new User(_this, user_info));
                    })
                    .catch(function (error) {
                        reject(error);
                    });
                } else {
                    _this.delegate('AccountLoginV1', {
                            domainIdent: opts.domain_ident,
                            loginType: opts.login_type || 0,
                            loginTag: opts.login_tag,
                            userPwd: opts.password
                    }, false)
                    .then(function (login_info) {
                        _this.login_info = login_info;
                        _this.connection.token = login_info.token;
                        return _this.delegate('AccountInfoV1');
                    })
                    .then(function (user_info) {
                        resolve(new User(_this, user_info));
                    })
                    .catch(function (error) {
                        reject(error);
                    });
                }
            });
    });
};

Account.prototype.logout = function () {
};

function User(account, user_info) {
    KObject.call(this, account.connection);
    this.account = account;
    this.properties = user_info;
    this.name = user_info.user_name;
    this.uid = user_info.user_id;
    this.is_privileger = user_info.super_type !== 0;
    this.is_superuser = user_info.super_type === 1;
    this.myDomain = new organization.KDomain(this, user_info.domain_id);
    this.mySpace = new organization.KSpace(this);
    this.myStaff = new organization.KStaff(this, {xid: user_info.xid, name: user_info.staff_name});
    this.rootDept = new organization.KDept(this, {xid: user_info.first_dept, name: user_info.domain_name});
    this.XFile = new xfile.XFile({user:this, properties:{}});
    this.cageHome = new xfile.KCageHome(this, user_info.cage_home);
    this.shareHome = new xfile.KShareHome(this, user_info.share_home);
    this.cageTrash = new xfile.KCageTrash(this);
    this.shareTrash = new xfile.KShareTrash(this);
}

util.inherits(User, KObject);

exports.User = User;
exports.Account = Account;
