#!/usr/bin/env node

var Download = require("./task").Download,
    helper = require("./helper");

(function () {
	var parser = new helper.MyArgumentParser();
	parser.set_options([
		[
			['-p', '--path'],
			{help: 'download file by path, share path begin with share(/share/path/to/download), cage path begin with cage./cage/path/to/download'}
		],
		[
			['-i', '--id'],
			{help: 'download file by id'}
		],
		[
			['-k', '--key'],
			{help: 'specify the login key'}
		],
		[
			['-v', '--version'],
			{help: 'download file of target version'}
		],
		[
			['-d', '--debug'],
			{help: 'debug mode, print detailed api call info'}
		]

	]);
	var args = parser.parse();
	if (args.path === null && args.id === null || args.key === null) {
		console.log("Use option -h|--help get help info");
		process.exit(0);
	}
	Download(args, function () {
		console.log('Download complete!!');
	}, function (error) {
		console.error(error.stack);
		process.exit(-1);
	});
})();

