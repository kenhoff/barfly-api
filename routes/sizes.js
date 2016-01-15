var jwtCheck = require('../jwtCheck.js');
var onConnect = require('../onConnect.js');
var getNextCounter = require('../getNextCounter.js');
var r = require('rethinkdb');

module.exports = function(app) {
	app.get("/sizes", function(req, res) {
		onConnect.connect(function(err, connection) {
			r.table("sizes").run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					response = []
					for (var i = 0; i < results.length; i++) {
						response.push(results[i].id)
					}
					res.json(response)
				})
			})
		})
	})

	app.post("/sizes", function(req, res) {
		onConnect.connect(function(err, connection) {
			getNextCounter("sizes", connection, function(err, newCounter) {
				r.table("sizes").insert({
					id: newCounter,
					sizeName: req.body.sizeName
				}).run(connection, function(err, result) {
					res.json(newCounter)
				})
			})
		})
	})

	app.get("/sizes/:sizeID", function(req, res) {
		onConnect.connect(function(err, connection) {
			r.table("sizes").get(parseInt(req.params.sizeID)).run(connection, function(err, result) {
				res.json(result)
			})
		})
	})
}
