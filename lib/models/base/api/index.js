var P = require('bluebird'),
util = require('util'),
_ = require('lodash'),
fs = require('fs'),
request = require('request');

function _retry_n_reject (opts) {
    var op_factory = opts.op_factory || function (operation) {return operation;},
    delay = opts.delay || 1000,
    counter = opts.counter || 1,
    max_retry = opts.max_retry || 1,
    operation = opts.operation || opts.op_factory(),
    retryPredicate = opts.retryPredicate || function (error) {
            return true;
    },
    logger = opts.logger || console;
    print_log = logger.debug||logger.log;
    return operation
    .catch(function (error) {
        var status = retryPredicate(error);
        if (status === null) {
            return P.resolve(error);
        } else if (status === false) {
            return P.reject(error);
        }
        if (counter > max_retry) {
            return P.reject(error);
        } else {
            print_log(util.format('Error %s happend, Retry %s, max %s, stack %s....', error, counter, max_retry, error.stack));
            var new_opts = {
                operation : op_factory(operation),
                delay : delay*2 ,
                counter : counter+1,
                max_retry : max_retry,
                retryPredicate : retryPredicate
            };
            return P.delay(delay)
            .then(_retry_n_reject.bind(null, new_opts));
        }
    });
}

module.exports.retry_n_reject = _retry_n_reject;

function _api_call_promise(opts) {
    var base_url = opts.base_url,
    api_version = opts.api_version,
    req_body = JSON.stringify(opts.args),
    api_url =  base_url + '/api/' + api_version + '/' + opts.api_name,
    method = opts.method,
    request_opts = {
        timeout: 120000,
        url: api_url,
        body: req_body,
        time: true,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': opts.user_agent
        }
    },
    print_log = opts.logger.debug||opts.logger.log;
    return new P(function (resolve, reject) {
        print_log(util.format("Requesting api Url: %s, Args: %s", request_opts.url, request_opts.body));
        request(request_opts, function (err, response, body) {
            if (!err && response.statusCode == 200) {
                print_log(util.format("Requesting api Url: %s, Args: %s, Response: %s, Consuming: %s", request_opts.url, request_opts.body, body, (Date.now()-response.request.startTime)/1000));
                api_data = JSON.parse(body);
                if (api_data.code !== 0) {
                    reject(api_data);
                } else {
                    resolve(api_data.data);
                }
            } else {
                reject(err||new Error(JSON.stringify({'code': response.statusCode, msg: util.format('Api %s call error', api_url)})));
            }
        });
    });
}

function callApi(opts, retryPredicate) {
    return _retry_n_reject({
        op_factory: function (old_operation) {
            return _api_call_promise(opts);
        },
        max_retry: 3,
        logger: opts.logger,
        retryPredicate: function (error) {
            if (retryPredicate !== undefined) {
                return retryPredicate(error);
            } else {
                return true;
            }
        }
    });
}

function check_args() {
    return true;
}

function router2function(router_path, router_mode, router_method, router_args) {
    var component = _.split(router_path, '/'),
    api_version = component[1],
    api_name = _.join(component.slice(2), "/"),
    function_name = _.join(_.map(component.slice(2), _.capitalize), "") + _.capitalize(api_version);
    module.exports['call' + function_name] = function (delegation, args, retryPredicate) {
            var new_args;
            if (check_args(router_args, args) !== true) {
            } else {
                new_args = {
                    base_url: delegation.connection.locations.common_url,
                    api_name: api_name,
                    api_version: api_version,
                    method: router_method,
                    user_agent: delegation.connection.user_agent,
                    logger: delegation.connection.logger || console,
                    args: args
                };
                return callApi(new_args, retryPredicate);
            }
    };
}

var files = fs.readdirSync(__dirname + '/routers');
for (var i in files) {
    var router = JSON.parse(fs.readFileSync(__dirname + '/routers/' + files[i]));
    for (var j = 0, len = router.length; j < len; j++) {
        router2function(router[j].pattern, 1, router[j].method, router[j].arguments);
    }
}

