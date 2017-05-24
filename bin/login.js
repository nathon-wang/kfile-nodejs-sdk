#! /bin/env node
var kfile = require("../lib/kfile"),
    ArgumentParser = require("argparse").ArgumentParser,
    fs = require("fs"),
    LOGIN_INFO_FILE = './logined_info';

function login(args) {
	var sdk = new kfile.KingFileSDK({host: args.host, port: args.port||80}),
		account = sdk.account(),
		loginedAccount = account.login({domain_ident: args.ident, login_tag: args.user, password: args.pass});

	loginedAccount.then(function (loginedAccount) {
		fs.writeFile('./.logined_info', JSON.stringify(loginedAccount.properties, null, 4), function(error) {
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
		{help: 'force login'}
	);

	var args = parser.parseArgs();
	if (args.force) {
		fs.unlink(LOGIN_INFO_FILE, function (error) {
			login();
		});
	} else {
		fs.readFile(LOGIN_INFO_FILE, function(buffer, error) {
			if (error) {
				login();
			} else {
				var login_info = JSON.parse(buffer.toString());
				if (login_info.token) {
					console.log(logined_info);
				} else {
					login();
				}
			}
		});
	}

}

main();
