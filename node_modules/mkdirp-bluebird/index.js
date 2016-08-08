'use strict'

var promise = require('bluebird')
var mkdirp = require('mkdirp')

module.exports = function (dir, opts) {
	return new promise(function (resolve, reject) {
		mkdirp(dir, opts, function (err, made) {
			return err === null ? resolve(made) : reject(err)
		})
	})
	.catch(function (err) {
		throw err
	})
}
