var P = require('bluebird'),
util = require("util"),
api = require('./api');

exports.api = api;

function KObject (connection) {
    var api_server_info;
    this.connection = connection;
}

KObject.prototype.delegate = function (callname, args, logined, retryPredicate) {
    var _this = this,
    loginRequired = logined||true,
    api_arguments = args||{};
    if (loginRequired === true) {
        api_arguments.token = this.connection.token;
    }
    return api['call'+callname](_this, api_arguments, retryPredicate);
};

exports.KObject = KObject;
