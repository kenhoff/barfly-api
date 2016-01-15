var jwtCheck = require('../jwtCheck.js');
// hacky and gross. any way around this?

var onConnect = require('../onConnect.js');
var getNextSequence = require('../getNextSequence.js');
var r = require('rethinkdb');

var request = require('request');

module.exports = function(app) {

	app.get("/user", jwtCheck, function(req, res) {
		request.get({
			url: "https://barfly.auth0.com/api/v2/users/" + req.user.user_id,
			headers: {
				"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJwS1J5S2J3dzVPRzRVVUIzdG5LYWJHZ1hqSTJDMnVNQiIsInNjb3BlcyI6eyJ1c2VycyI6eyJhY3Rpb25zIjpbInJlYWQiXX19LCJpYXQiOjE0NTI2NTA0MTIsImp0aSI6ImNjOGJkOTUzZDNlN2ZiMDgxOGUzYmMyNDMwZTk5MjBlIn0.PPIGaF86A-dk6DgN8jIZGUS-EFqooUALyRkL_7kafhc"
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
			url: "https://barfly.auth0.com/api/v2/users/" + req.user.user_id,
			headers: {
				"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJwS1J5S2J3dzVPRzRVVUIzdG5LYWJHZ1hqSTJDMnVNQiIsInNjb3BlcyI6eyJ1c2VycyI6eyJhY3Rpb25zIjpbInVwZGF0ZSJdfX0sImlhdCI6MTQ1MjY0OTkyOSwianRpIjoiMzBhNDgxMzYwYWYwOWZlYzY3YWNlOTFlZGUzYWM5ZTQifQ.kwwT06o7jIDo4TiqPVl-b_-BFhDfOtR-QR_ohRqVDAA"
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
			getNextSequence("bars", connection, function(err, newSeq) {
				r.table("bars").insert({
					id: newSeq,
					barName: req.body.barName,
					zipCode: parseInt(req.body.zipCode)
				}).run(connection, function(err, result) {
					newBarID = newSeq
					addUserToBar(req.user.user_id, newBarID, function() {
						res.send({
							id: newSeq,
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
			r.table("bar_memberships").getAll(userID, {
				index: "userID"
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
			r.table("bar_memberships").getAll(userID, {
				index: "userID"
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
