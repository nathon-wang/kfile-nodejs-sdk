var kfile = require("../lib/kfile"),
    assert = require("assert");

describe('Create SDK object and login as admin', function () {
    var loginedUser;
    var sdk = new kfile.KingFileSDK({host: "192.168.8.103", port: 80, device_id: "xxxxx"});
    var account = sdk.account();
    var loginedAccount = account.login({domain_ident: "dev.com", login_tag: "admin", password: "123456"});

    it('should create a share root', function () {
        return loginedAccount.then(function (loginedUser) {
            return loginedUser.shareHome.mkdir({
                name: '11111',
                perm: [{user_xid: loginedUser.rootDept.xid, role: kfile.Role.MANIPULATOR}]
            })
            .catch(function (error) {
            });
        });
    });

    it('should get a share root list', function () {
        return loginedAccount.then(function (loginedUser) {
            return loginedUser.shareHome.mkdir({
                name: 'wwwwww',
                perm: [{user_xid: loginedUser.rootDept.xid, role: kfile.Role.MANIPULATOR}]
            });
        });
    });

    it('should login server and get a user object', function () {
        return loginedAccount
        .then(function(loginedUser) {
            loginedUser
            .shareHome.info()
            .then(function (data) {
            });
        });
    });
});

