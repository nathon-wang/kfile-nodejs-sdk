var kfile = require("../lib/kfile"),
    uuid = require('node-uuid');
    assert = require("assert");

var loginedUser;
var host = "192.168.140.124";
var sdk = new kfile.KingFileSDK({host: host, port: 80});
var account = sdk.account();
var loginedAccount = account.login({domain_ident: "ceshi001", login_tag: "admin", password: "123456"});


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

//describe('download a dir', function () {
//    it('should download a directory', function (done) {
//        this.timeout(5000);
//        loginedAccount.then(function (loginedUser) {
//            return loginedUser.XFile.info(8589934595);
//            //return loginedUser.shareHome.get_one_page().delay(1000);
//        })
//        .then(function (fileObj) {
//            return fileObj.download();
//            //return lstObj[0].download();
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
describe('upload a file', function () {
    it('should upload a file ', function (done) {
        this.timeout(5000);
        loginedAccount.then(function (loginedUser) {
            return loginedUser.XFile.info(8589934595);
            //return loginedUser.shareHome.get_one_page().delay(1000);
        })
        .then(function (fileObj) {
            return fileObj.upload({path: "./test/admin.js"});
            //return lstObj[0].download();
        })
        .then(function () {
            done();
        })
        .catch(function (error) {
            done(error);
        });
    });
});
