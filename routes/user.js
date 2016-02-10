var jwtCheck = require('../jwtCheck.js');
// hacky and gross. any way around this?

var onConnect = require('../onConnect.js');
var getNextCounter = require('../getNextCounter.js');
var r = require('rethinkdb');

var request = require('request');

module.exports = function(app) {

	app.get("/user", jwtCheck, function(req, res) {
		request.get({
			url: "https://" + process.env.AUTH0_DOMAIN + "/api/v2/users/" + req.user.user_id,
			headers: {
				"Authorization": "Bearer " + process.env.AUTH0_API_JWT
			},
		}, function(err, response, body) {
			if (err) {
				res.sendStatus(500)
			} else if (response.statusCode < 300) {
				res.json(JSON.parse(body))
			} else {
				res.sendStatus(500)
			}
		})
	})

	// update the user in the jwt
	app.patch("/user", jwtCheck, function(req, res) {
		// TODO validate req.body.phone
		request.patch({
			url: "https://" + process.env.AUTH0_DOMAIN + "/api/v2/users/" + req.user.user_id,
			headers: {
				"Authorization": "Bearer " + process.env.AUTH0_API_JWT
			},
			form: {
				user_metadata: {
					phone: req.body.phone
				}
			}
		}, function(err, response, body) {
			if (err) {
				res.sendStatus(500)
			} else if (response.statusCode < 300) {
				res.json(JSON.parse(body))
			} else {
				res.sendStatus(500)
			}
		})
	})

	app.get("/user/bars", jwtCheck, function(req, res) {
		getUserBars(req.user.user_id, function(bars) {
			res.send(bars)
		})
	})

	app.post("/user/bars", jwtCheck, function(req, res) {
		// console.log(req.body);

		// validate name and zipcode
		// attempt to create the bar
		// first, get the latest "bars" sequence # from the "counters" table
		onConnect.connect(function(err, connection) {
			getNextCounter("bars", connection, function(err, newCounter) {
				r.table("bars").insert({
					id: newCounter,
					barName: req.body.barName,
					zipCode: parseInt(req.body.zipCode)
				}).run(connection, function(err, result) {
					newBarID = newCounter
					addUserToBar(req.user.user_id, newBarID, function() {
						res.send({
							id: newCounter,
							barName: req.body.barName,
							zipCode: parseInt(req.body.zipCode)
						})
					})
				})
			})
		})
	})

	addUserToBar = function(userID, barID, cb) {
		onConnect.connect(function(err, connection) {
			r.table("bar_memberships").filter({
				userID: userID
			}).filter({
				barID: barID
			}).run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					if (results.length == 0) {
						r.table("bar_memberships").insert({
							barID: barID,
							userID: userID,
							role: "manager"
						}).run(connection, function(err, result) {
							if (!err) {
								cb()
							} else {
								// throw something?
							}
						})
					}
				})
			})
		})
	}

	getUserBars = function(userID, cb) {
		// instead of getting the list of user bars from Auth0, we're gonna get the list of user bars from the "bar_memberships" table
		onConnect.connect(function(err, connection) {
			console.log(err);
			r.table("bar_memberships").filter({
				userID: userID
			}).withFields("barID").run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					bars = []
					for (var i = 0; i < results.length; i++) {
						bars.push(results[i].barID)
					}
					cb(bars)
				})
			})
		})
	}
}
