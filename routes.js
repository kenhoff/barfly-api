var r = require('rethinkdb');
var fs = require('fs');

var onConnect = require('./onConnect.js');
var getNextSequence = require('./getNextSequence.js');

var jwtCheck = require('./jwtCheck.js');

module.exports = function(app) {

	app.get("/", function(req, res) {
		res.send(200)
	})

	require("./routes/user.js")(app)
	require("./routes/bars.js")(app)

	addUserToBar = function(userID, barID, cb) {
		onConnect(function(connection) {
			r.table("memberships").getAll(userID, {
				index: "userID"
			}).filter({
				barID: barID
			}).run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					if (results.length == 0) {
						r.table("memberships").insert({
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
		// instead of getting the list of user bars from Auth0, we're gonna get the list of user bars from the "memberships" table
		onConnect(function(connection) {
			r.table("memberships").getAll(userID, {
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
