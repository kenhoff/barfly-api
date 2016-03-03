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
					} else if (results.length == 0) {
						res.json({})
					} else {
						res.json(results[0])
					}
					connection.close()
				})
			})
		})
	})

	app.post("/accounts", jwtCheck, function(req, res) {
		onConnect.connect(function(err, connection) {
			// first, check to see if there's already an account with this barID and distributorID
			r.table("accounts").filter({
				barID: parseInt(req.body.barID),
				distributorID: parseInt(req.body.distributorID)
			}).run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					if (results.length >= 1) {
						// if there is, update that one
						r.table('accounts').get(results[0].id).update({
							barID: parseInt(req.body.barID),
							repID: req.body.repID,
							distributorID: parseInt(req.body.distributorID)
						}).run(connection, function(err, result) {
							if (!err) {
								res.sendStatus(200)
							}
							connection.close()
						})

					} else {
						// if not, insert a new one
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
								connection.close()
							})
						})
					}
				})
			})


		})
	})
}
