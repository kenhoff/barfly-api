var r = require('rethinkdb');
var onConnect = require('../onConnect.js');
var getNextSequence = require('../getNextSequence.js');
var jwtCheck = require('../jwtCheck.js');

module.exports = function(app) {
	app.get("/accounts", jwtCheck, function(req, res) {
		// if contains search params, search for that with filter. else, return all
		onConnect(function(connection) {
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
		onConnect(function(connection) {
			getNextSequence("accounts", connection, function(newSeq) {
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
