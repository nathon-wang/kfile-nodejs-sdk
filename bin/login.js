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
			['-k', '--key'],
			{help: 'specify the login key'}
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
			['-d', '--debug'],
			{help: 'debug mode, print detailed api call info'}
		]
	]);

	var args = parser.parse();
	if ((args.host === null || args.user === null || args.pass === null || args.ident === null) && args.key === null) {
		console.log("Use option -h|--help get help info");
		process.exit(0);
	}

	helper.loadLoginInfo(args.key, function () {
		Login(args, function (info) {
			console.log(JSON.stringify(info, null, 4));
		}, function(error) {
			console.log(error.stack);
			process.exit(-1);
		});
	}, function (logined_info) {
		console.log(JSON.stringify(logined_info, null, 4));
	});

})();

