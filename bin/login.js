#!/usr/bin/env node

var kfile = require("../lib/kfile"),
    ArgumentParser = require("argparse").ArgumentParser,
    fs = require("fs"),
    _ = require("lodash"),
    Login = require("./task").Login,
    helper = require("./helper");

(function main() {
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
			{help: 'debug mode, print detailed api call info'}
		]
	]);

	var args = parser.parse();
	if (args.host === null || args.user === null || args.pass === null || args.ident === null) {
		console.log("Use option -h|--help get help info");
		process.exit(0);
	}

	if (args.force !== null) {
		helper.forceLogin(function () {
			Login(args, function (info) {
			        console.log(JSON.stringify(info, null, 4));
			}, function(error) {
				console.log(error.stack);
				process.exit(-1);
			});
		});
	} else {
		helper.loadLoginInfo(function () {
			Login(args, function (info) {
			        console.log(JSON.stringify(info, null, 4));
			}, function(error) {
				console.log(error.stack);
				process.exit(-1);
			});
		}, function (logined_info) {
			console.log(JSON.stringify(logined_info, null, 4));
		});
	}

})();

