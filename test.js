var kfile = require("./lib/kfile");

var sdk = new kfile.KingFileSDK({host: "192.168.8.103", port: 80, device_id: "xxxxx"});
var myAccount = sdk.account();
myAccount.login({domain_ident: "dev.com", login_tag: "admin", password: "123456"})
.then (function (loginedUser) {
    var user = loginedUser, shareHome;
    shareHome = user.shareHome;
    shareHome.get_one_page()
    .then(function (objs) {
    });
});


