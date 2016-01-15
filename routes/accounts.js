var r = require('rethinkdb');
var onConnect = require('../onConnect.js');
var getNextCounter = require('../getNextCounter.js');
var jwtCheck = require('../jwtCheck.js');

module.exports = function(app) {
	app.get("/accounts", jwtCheck, function(req, res) {
		// if contains search params, search for that with filter. else, return all
		onConnect.connect(function(err, connection) {
			r.table('accounts').filter({
				barID: parseInt(req.query.barID),
				distributorID: parseInt(req.query.distributorID)
			}).run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					if (results.length > 1) {
						// throw err
					} else {
						res.json(results[0])
					}
				})
			})
		})
	})

	app.post("/accounts", jwtCheck, function(req, res) {
		onConnect.connect(function(err, connection) {
			getNextCounter("accounts", connection, function(err, newCounter) {
				// should really probably check to see if there's already an account in here...
				r.table('accounts').insert({
					barID: parseInt(req.body.barID),
					repID: req.body.repID,
					distributorID: parseInt(req.body.distributorID)
				}).run(connection, function(err, result) {
					if (!err) {
						res.sendStatus(200)
					}
				})
			})
		})
	})
}
