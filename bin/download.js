#! env node
var kfile = require("../lib/kfile"),
    helper = require("./helper");

(function () {
	var parser = new helper.MyArgumentParser();
	parser.set_options([
			[
				['-p', '--path'],
				{help: 'download file by path'}
			],
			[
				['-i', '--id'],
				{help: 'download file by id'}
			]

	]);
	var args = parser.parse();
	if (args.path === null && args.id === null) {
		console.log('path && id can\'t be null both');
		process.exit(-1);

	} else {
		helper.loginProtected(function (Account) {
			Account.then(function (loginedAccount) {
				var remote_location = args.id || args.path;
				if (!remote_location) {
					throw new Error("Remote location is not specified!!!");
				} else {
					return loginedAccount.XFile.info(remote_location);
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
		});
	}
})();

