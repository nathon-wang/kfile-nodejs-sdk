#! /bin/env node
var kfile = require("../lib/kfile"),
    ArgumentParser = require("argparse").ArgumentParser,
    fs = require("fs"),
    _ = require("lodash"),
    helper = require("./helper");

(function main() {
	function login(args) {
		var sdk = new kfile.KingFileSDK({host: args.host, port: args.port||80}),
			account = sdk.account(),
			loginedAccount = account.login({domain_ident: args.ident, login_tag: args.user, password: args.pass});

		loginedAccount.then(function (loginedAccount) {
			var info = _.merge(loginedAccount.properties, {host: args.host, port: args.port||80});
			helper.saveLoginInfo(info, function (error) {
				if (error) {
					console.log(error);
				}
			});
		});
	}

	var parser = new helper.MyArgumentParser();
	parser.set_options([
		[
			['-i', '--ident'],
			{help: 'domain ident'}
		],
		[
			['-u', '--user'],
			{help: 'user name'}
		],
		[
			['-p', '--pass'],
			{help: 'password'}
		],
		[
			['-H', '--host'],
			{help: 'kingfile host'}
		],
		[
			['-P', '--port'],
			{help: 'kingfile port'}
		],
		[
			['-f', '--force'],
			{help: 'force login', nargs: 0, defaultValue: null}
		]

	]);

	var args = parser.parse();
	if (args.force !== null) {
		helper.forceLogin(function () {
			login(args);
		});
	} else {
		helper.loadLoginInfo(function () {
			login(args);
		}, function (logined_info) {
			console.log(logined_info);
		});
	}

})();

