var r = require('rethinkdb');
var onConnect = require('../onConnect.js');
var getNextCounter = require('../getNextCounter.js');
var jwtCheck = require('../jwtCheck.js');


module.exports = function(app) {
	app.get("/distributors", function(req, res) {
		onConnect.connect(function(err, connection) {
			r.table("distributors").run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					res.json(results)
					connection.close()
				})
			})
		})
	})


	app.post("/distributors", jwtCheck, function(req, res) {
		onConnect.connect(function(err, connection) {
			getNextCounter("distributors", connection, function(err, newCounter) {
				r.table("distributors").insert({
					id: newCounter,
					distributorName: req.body.distributorName
				}).run(connection, function(err, result) {
					res.json({
						distributorID: newCounter
					})
					connection.close()
				})
			})
		})
	})

	app.get("/distributors/:distributorID", function(req, res) {
		onConnect.connect(function(err, connection) {
			r.table("distributors").get(parseInt(req.params.distributorID)).run(connection, function(err, result) {
				res.json(result)
				connection.close()
			})
		})
	})
}
