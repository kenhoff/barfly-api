// hacky and gross. any way around this?
var jwtCheck = require('../../jwtCheck.js');
var onConnect = require('../../onConnect.js');
var getNextCounter = require('../../getNextCounter.js');
var r = require('rethinkdb');


module.exports = function(app) {

	require('./starred')(app);

	app.get("/bars/:barID", jwtCheck, function(req, res) {
		getUserBars(req.user.user_id, function(bars) {
			barID = parseInt(req.params.barID)
			if (bars.indexOf(barID) > -1) {
				onConnect.connect(function(err, connection) {
					r.table("bars").get(parseInt(req.params.barID)).run(connection, function(err, result) {
						res.send(result)
						connection.close()
					})
				})
			} else {
				res.sendStatus(401)
			}
		})
	})

	app.get("/bars/:barID/orders", jwtCheck, function(req, res) {
		// check and make sure the user is a member of this bar
		getUserBars(req.user.user_id, function(bars) {
			barID = parseInt(req.params.barID)
			if (bars.indexOf(parseInt(req.params.barID)) > -1) {
				onConnect.connect(function(err, connection) {
					r.table("orders").filter({
						barID: parseInt(req.params.barID)
					}).run(connection, function(err, cursor) {
						cursor.toArray(function(err, results) {
							results.sort(function(a, b) {
								if (a.id < b.id) {
									return -1
								} else if (a.id > b.id) {
									return 1
								} else {
									return 0
								}
							})
							res.json(results)
							connection.close()
						})
					})
				})
			} else {
				res.sendStatus(401)
			}
		})
	})

	app.post("/bars/:barID/orders", jwtCheck, function(req, res) {
		// check and make sure the user is a member of this bar
		getUserBars(req.user.user_id, function(bars) {
			barID = parseInt(req.params.barID)
			if (bars.indexOf(parseInt(req.params.barID)) > -1) {
				onConnect.connect(function(err, connection) {
					getNextCounter("orders", connection, function(err, newCounter) {
						r.table("orders").insert({
							id: newCounter,
							barID: parseInt(req.params.barID),
							sent: false
						}, {
							returnChanges: true
						}).run(connection, function(err, result) {
							res.json(result["changes"][0]["new_val"]["id"])
							connection.close()
						})
					})
				})
			} else {
				res.sendStatus(401)
			}
		})
	})

}
