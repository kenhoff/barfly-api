var jwtCheck = require('../jwtCheck.js');
var onConnect = require('../onConnect.js');
var getNextSequence = require('../getNextSequence.js');
var r = require('rethinkdb');
var async = require('async');

module.exports = function(app) {
	app.patch("/bars/:barID/orders/:orderID", function(req, res) {
		async.each(req.body.orders, saveProductOrder, function(err) {
			res.send(200)
		})
	})

	saveProductOrder = function(order, cb) {
		console.log("order:", order);
		cb()
	}

}
