var _ = require("lodash"),
    kfile = require("../lib/kfile"),
    helper = require("./helper");


function upload(args, succeed, failed) {
	helper.loginProtected(args)(function (Account) {
		Account.then(function (loginedAccount) {
			var remote_location = args.id || args.path;
			if (!remote_location) {
				throw new Error("Remote location is not specified!!!");
			} else {
				return loginedAccount.XFile.info(remote_location);
			}
		})
		.then(function (fileObj) {
			return fileObj.upload({path: args.target});
		})
		.then(function () {
			succeed();
		})
		.catch(function (error) {
			failed(error);
		});
	});
}

exports.Upload = upload;

function download(args, succeed, failed) {
	helper.loginProtected(args)(function (Account) {
		Account.then(function (loginedAccount) {
			var remote_location = args.id || args.path;
			if (!remote_location) {
				throw new Error("Remote location is not specified!!!");
			} else {
				return loginedAccount.XFile.info(remote_location);
			}
		})
		.then(function (fileObj) {
			var opts = args.version === null ? {} : {file_version: args.version};
			return fileObj.download(opts);
		})
		.then(function () {
			succeed();
		})
		.catch(function (error) {
			failed(error);
		});
	});
}

exports.Download = download;

function login(args, succeed, failed) {
	var sdk = new kfile.KingFileSDK({host: args.host, port: args.port||80, debug: args.debug}),
		account = sdk.account(),
		loginedAccount = account.login({domain_ident: args.ident, login_tag: args.user, password: args.pass});

	loginedAccount.then(function (loginedAccount) {
		var info = _.merge(loginedAccount.properties, {host: args.host, port: args.port||80, user_agent:sdk.user_agent});
		helper.saveLoginInfo(info, function (error) {
			if (error) {
				failed(error);
			} else {
				succeed(info);
			}
		});
	})
	.catch(function (error) {
		failed(error);
	});
}

exports.Login = login;
