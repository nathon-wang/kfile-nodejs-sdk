#! /bin/env node
var kfile = require("../lib/kfile"),
    ArgumentParser = require("argparse").ArgumentParser,
    fs = require("fs"),
    LOGIN_INFO_FILE = './.logined_info';

function main() {
	var parser = new ArgumentParser({addHelp: true, description:''});
	parser.addArgument(
		['-p', '--path'],
		{help: 'download file by path'}
	);

	parser.addArgument(
		['-i', '--id'],
		{help: 'download file by id'}
	);

	var args = parser.parseArgs();
	console.log(args);
	fs.readFile(LOGIN_INFO_FILE, function(error, buffer) {
		if (error) {
			console.error('not login!!!');
			process.exit(-1);
		} else {
			var login_info = JSON.parse(buffer.toString());
			if (login_info.token) {
				var sdk = new kfile.KingFileSDK({host: login_info.host, port: login_info.port||80}),
					account = sdk.account(),
					Account = account.login({token: login_info.token});

				Account.then(function (loginedAccount) {
					var download_tag = args.id || args.path;
					if (download_tag) {
						throw new Error();
					} else {
						return loginedAccount.XFile.info(download_tag);
					}
				})
				.then(function (fileObj) {
					return fileObj.download();
				})
				.then(function () {
					console.log('Download complete!!');
				})
				.catch(function (error) {
					console.error(error);
				});
			} else {
				console.error('not login!!!');
				process.exit.exit(-1);
			}
		}
	});
}

main();
