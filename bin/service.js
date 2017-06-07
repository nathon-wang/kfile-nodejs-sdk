#!/usr/bin/env node

var App = require('./app').App,
    helper = require("./helper"),
    cluster = require('cluster');

(function () {
	var parser = new helper.MyArgumentParser();
	parser.set_options([
		[
			['-p', '--port'],
			{help: 'service port'}
		],
		[
			['-d', '--debug'],
			{help: 'debug mode, print detailed api call info', action: 'storeTrue'}
		]

	]);

	var args = parser.parse();
	if (args.debug) {
		if (cluster.isMaster) {
		    var cpuCount = require('os').cpus().length;
		    for (var i = 0; i < cpuCount; i += 1) {
			cluster.fork();
		    }
		} else {
		    (new App({port: args.port||80})).start();
		}
	} else {
		(new App({port: args.port||80})).start();
	}
})();
