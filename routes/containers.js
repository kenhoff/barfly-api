var jwtCheck = require('../jwtCheck.js');
var onConnect = require('../onConnect.js');
var getNextCounter = require('../getNextCounter.js');
var r = require('rethinkdb');

module.exports = function(app) {
	app.get("/containers", function(req, res) {
		onConnect.connect(function(err, connection) {
			r.table("containers").run(connection, function(err, cursor) {
				if (err) {
					res.status(500).send(err)
				}
				cursor.toArray(function(err, results) {
					res.json(results)
					connection.close()
				})
			})
		})
	})
	app.get("/containers/:containerID", function(req, res) {
		onConnect.connect(function(err, connection) {
			r.table("containers").get(parseInt(req.params.containerID)).run(connection, function(err, result) {
				if (err) {
					res.status(500).send(err)
				} else {
					res.json(result)
				}
				connection.close()
			})
		})
	})
}
