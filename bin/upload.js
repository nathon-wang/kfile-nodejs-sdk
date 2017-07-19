#!/usr/bin/env node

var Upload = require('./task').Upload;
    helper = require("./helper");

(function () {
	var parser = new helper.MyArgumentParser();
	parser.set_options([
		[
			['-p', '--path'],
			{help: 'upload file by path, share path begin with share(/share/path/to/upload), cage path begin with cage./cage/path/to/upload'}
		],
		[
			['-k', '--key'],
			{help: 'specify the login key'}
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
			{help: 'debug mode, print detailed api call info'}
		]
	]);

	var args = parser.parse();
	if (args.target === null || args.path === null && args.id === null) {
		console.log('Use -h|--help option for help');
		process.exit(0);
	}
	Upload(args, function () {
		console.log('Upload complete!!');
		process.exit(0);
	}, function (error) {
		console.error(error.stack);
		process.exit(-1);
	});
})();
