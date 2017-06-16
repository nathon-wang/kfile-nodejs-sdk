var kfile = require("../lib/kfile"),
    fs = require("fs"),
    ArgumentParser = require('argparse').ArgumentParser,
    _ = require("lodash"),
    login_info_file = '.logined_info',
    login_config = '/etc/kingfile.conf',
    login_info_directory;

if (fs.existsSync(login_config)) {
	login_info_directory = fs.readSync(login_config);
} else {
        login_info_directory = require('os').homedir();
}

var LOGIN_INFO_FILE = login_info_directory + '/' + login_info_file;

function MyArgumentParser() {
	this.parser = new ArgumentParser({addHelp: true, description:''});

}

MyArgumentParser.prototype.set_options = function (opts) {
	var _this = this;
	this.opts = opts;
	this.opts.forEach(function (item) {
		_this.parser.addArgument(item[0], item[1]);
	});
};

MyArgumentParser.prototype.parse = function () {
	return this.parser.parseArgs();
};

exports.MyArgumentParser = MyArgumentParser;

function loginProtected(args) {
	return function (operation) {
		fs.readFile(LOGIN_INFO_FILE, function(error, buffer) {
			if (error) {
				console.error('not login!!!');
				process.exit(-1);
			} else {
				var data = buffer.toString(), login_info_arr, login_info;
				if (!data) {
					console.error('not login!!!');
					process.exit(-1);
				}

				try {
					login_info_arr = JSON.parse(buffer.toString());
					if (args.key) {
						login_info = _.find(login_info_arr, function(item) {
							if (item.info_key === args.key) {
								return item;
							}
						});

					} else {
						login_info = login_info_arr[0];
					}
					if(!login_info) {
						console.error('not login!!!');
						process.exit(-1);
					}
					if (login_info.token) {
						var sdk = new kfile.KingFileSDK({host: login_info.host, port: login_info.port||80, debug: args.debug, user_agent: login_info.user_agent}),
							account = sdk.account(),
							Account = account.login({token: login_info.token});
						operation(Account);
					} else {
						console.error('not login!!!');
						process.exit(-1);
					}
				} catch (e) {
					console.error('not login!!!');
					process.exit(-1);
				}
			}
		});
	};
}

exports.loginProtected = loginProtected;

function forceLogin(not_logined_func) {
	fs.unlink(LOGIN_INFO_FILE, function (error) {
		not_logined_func();
	});
}

exports.forceLogin = forceLogin;

function loadLoginInfo(not_logined_func, logined_func) {
	fs.readFile(LOGIN_INFO_FILE, function(error, buffer) {
		if (error) {
			not_logined_func();
		} else {
			var logined_info = JSON.parse(buffer.toString());
			if (logined_info.token) {
				logined_func(logined_info);
			} else {
				not_logined_func();
			}
		}
	});
}

exports.loadLoginInfo = loadLoginInfo;

function saveLoginInfo(login_info, callback) {
	fs.readFile(LOGIN_INFO_FILE, function (error, buffer) {
		var content = [login_info];
		if (!error) {
			var data = buffer.toString(), idx;
			if(data) {
				var logined_info_arr = JSON.parse(data);
				logined_info_arr.forEach(function (index, item) {
					if(item.user_id == login_info.user_id) {
						idx = index;
					}
				});
				if (idx !== undefined) {
					logined_info_arr.splice(idx, 1);
				}
				logined_info_arr.push(login_info);
			}
		}
		fs.writeFile(LOGIN_INFO_FILE, JSON.stringify(content, null, 4), function(error) {
			callback(error);
		});
	});
}

exports.saveLoginInfo = saveLoginInfo;


