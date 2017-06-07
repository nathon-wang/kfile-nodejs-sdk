#!/usr/bin/env node

var kfile = require("../lib/kfile"),
    helper = require("./helper");


(function () {
	var parser = new helper.MyArgumentParser();
	parser.set_options([
		[
			['-p', '--path'],
			{help: 'the upload directory path of kingfile netdisk'}
		],
		[
			['-i', '--id'],
			{help: 'the upload directory id of kingfile netdisk'}
		],
		[
			['-t', '--target'],
			{help: 'the target file or directory what you want to upload'}
		],
		[
			['-d', '--debug'],
			{help: 'debug mode, print detailed api call info', action: 'storeTrue'}
		]

	]);

	var args = parser.parse();
	if (args.target === null) {
		console.log('Use -h|--help option for help');
		process.exit(-1);
	} else if (args.path === null && args.id === null) {
		console.log('Use -h|--help option for help');
		process.exit(-1);
	} else {
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
				console.log('Upload complete!!');
				process.exit(0);
			})
			.catch(function (error) {
				console.error(error.stack);
				process.exit(-1);
			});
		});
	}
})();
