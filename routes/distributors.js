var r = require('rethinkdb');
var onConnect = require('../onConnect.js');
var getNextSequence = require('../getNextSequence.js');
var jwtCheck = require('../jwtCheck.js');


module.exports = function(app) {
	app.get("/distributors", function(req, res) {
		onConnect.connect(function(err, connection) {
			r.table("distributors").run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					res.json(results)
				})
			})
		})
	})


	app.post("/distributors", jwtCheck, function(req, res) {
		onConnect.connect(function(err, connection) {
			getNextSequence("distributors", connection, function(err, newSeq) {
				r.table("distributors").insert({
					id: newSeq,
					distributorName: req.body.distributorName
				}).run(connection, function(err, result) {
					res.json({
						distributorID: newSeq
					})
				})
			})
		})
	})

	app.get("/distributors/:distributorID", function(req, res) {
		onConnect.connect(function(err, connection) {
			r.table("distributors").get(parseInt(req.params.distributorID)).run(connection, function(err, result) {
				res.json(result)
			})
		})
	})
}
