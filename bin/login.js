#!/usr/bin/env node

var kfile = require("../lib/kfile"),
    ArgumentParser = require("argparse").ArgumentParser,
    fs = require("fs"),
    _ = require("lodash"),
    helper = require("./helper");

(function main() {
	function login(args) {
		var sdk = new kfile.KingFileSDK({host: args.host, port: args.port||80, debug: args.debug}),
			account = sdk.account(),
			loginedAccount = account.login({domain_ident: args.ident, login_tag: args.user, password: args.pass});

		loginedAccount.then(function (loginedAccount) {
			var info = _.merge(loginedAccount.properties, {host: args.host, port: args.port||80, user_agent:sdk.user_agent});
			helper.saveLoginInfo(info, function (error) {
				if (error) {
					console.log(error.stack);
					process.exit(-1);
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
		],
		[
			['-d', '--debug'],
			{help: 'debug mode, print detailed api call info', action: 'storeTrue'}
		]
	]);

	var args = parser.parse();
	if (args.host === null || args.user === null || args.pass === null || args.ident === null) {
		console.log("Use option -h|--help get help info");
		process.exit(0);
	}

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

