var kfile = require("../lib/kfile"),
    uuid = require('node-uuid');
    assert = require("assert");

var loginedUser;
var host = "192.168.8.103";
var sdk = new kfile.KingFileSDK({host: host, port: 80, device_id: "xxxxx"});
var account = sdk.account();
var loginedAccount = account.login({domain_ident: "dev.com", login_tag: "admin", password: "123456"});


//describe('basic create & archive', function () {
//    it('should create a share root and archive it', function (done) {
//        loginedAccount.then(function (loginedUser) {
//            return loginedUser.shareHome.mkdir({
//                name: uuid.v1(),
//                perm: [{user_xid: loginedUser.rootDept.xid, role: kfile.Role.MANIPULATOR}]
//            })
//            .then(function (kdir) {
//                return kdir.archive();
//            });
//        })
//        .then(function () {
//            done();
//        })
//        .catch(function (error) {
//            done(error);
//        });
//    });
//});
//
//describe('basic create & archive', function () {
//    it('should create a share root and rename it', function (done) {
//        var name = uuid.v1();
//        this.timeout(5000);
//        loginedAccount.then(function (loginedUser) {
//            return loginedUser.shareHome.mkdir({
//                name: name,
//                perm: [{user_xid: loginedUser.rootDept.xid, role: kfile.Role.MANIPULATOR}]
//            })
//            .delay(1000)
//            .then(function (kdir) {
//                return kdir.rename(name + '_rename');
//            })
//            .then(function (kdir) {
//                return kdir.archive();
//            });
//        })
//        .then(function () {
//            done();
//        })
//        .catch(function (error) {
//            done(error);
//        });
//    });
//});
//
//describe('basic create & archive', function () {
//    it('should create a share root and remove it', function (done) {
//        var name = uuid.v1();
//        loginedAccount.then(function (loginedUser) {
//            return loginedUser.shareHome.mkdir({
//                name: name,
//                perm: [{user_xid: loginedUser.rootDept.xid, role: kfile.Role.MANIPULATOR}]
//            })
//            .delay(1000)
//            .then(function (kdir) {
//                return kdir.archive();
//            })
//            .then(function (kdir) {
//                return kdir.remove();
//            });
//        })
//        .then(function () {
//            done();
//        })
//        .catch(function (error) {
//            done(error);
//        });
//    });
//});
//
describe('download a dir', function () {
    it('should download a directory', function (done) {
        loginedAccount.then(function (loginedUser) {
            return loginedUser.shareHome.get_one_page()
            .delay(1000)
            .then(function (lstObj) {
                return lstObj[0].download();
            })
            .then(function (snapshot) {
                console.log(snapshot);
                done();
            });
        })
        .then(function () {
        })
        .catch(function (error) {
            done(error);
        });
    });
});
