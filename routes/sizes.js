var jwtCheck = require('../jwtCheck.js');
var onConnect = require('../onConnect.js');
var getNextSequence = require('../getNextSequence.js');
var r = require('rethinkdb');

module.exports = function(app) {
	app.get("/sizes", function(req, res) {
		onConnect(function(connection) {
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
		onConnect(function(connection) {
			getNextSequence("sizes", connection, function(err, newSeq) {
				r.table("sizes").insert({
					id: newSeq,
					sizeName: req.body.sizeName
				}).run(connection, function(err, result) {
					res.json(newSeq)
				})
			})
		})
	})

	app.get("/sizes/:sizeID", function(req, res) {
		onConnect(function(connection) {
			r.table("sizes").get(parseInt(req.params.sizeID)).run(connection, function(err, result) {
				res.json(result)
			})
		})
	})
}
