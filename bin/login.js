#! /bin/env node
var kfile = require("../lib/kfile"),
    ArgumentParser = require("argparse").ArgumentParser,
    fs = require("fs"),
    _ = require("lodash"),
    LOGIN_INFO_FILE = './.logined_info';

function login(args) {
	var sdk = new kfile.KingFileSDK({host: args.host, port: args.port||80}),
		account = sdk.account(),
		loginedAccount = account.login({domain_ident: args.ident, login_tag: args.user, password: args.pass});

	loginedAccount.then(function (loginedAccount) {
		var info = _.merge(loginedAccount.properties, {host: args.host, port: args.port||80});
		fs.writeFile('./.logined_info', JSON.stringify(info, null, 4), function(error) {
			if (error) {
			}
		});
	});
}

function main() {
	var parser = new ArgumentParser({addHelp: true, description:''});
	parser.addArgument(
		['-i', '--ident'],
		{help: 'domain ident'}
	);
	parser.addArgument(
		['-u', '--user'],
		{help: 'user name'}
	);
	parser.addArgument(
		['-p', '--pass'],
		{help: 'password'}
	);
	parser.addArgument(
		['-H', '--host'],
		{help: 'kingfile host'}
	);
	parser.addArgument(
		['-P', '--port'],
		{help: 'kingfile port'}
	);
	parser.addArgument(
		['-f', '--force'],
		{help: 'force login', defaultValue: false}
	);

	var args = parser.parseArgs();
	if (args.force) {
		fs.unlink(LOGIN_INFO_FILE, function (error) {
			login();
		});
	} else {
		fs.readFile(LOGIN_INFO_FILE, function(error, buffer) {
			if (error) {
				login();
			} else {
				var logined_info = JSON.parse(buffer.toString());
				if (logined_info.token) {
					console.log(logined_info);
				} else {
					login();
				}
			}
		});
	}

}

main();
