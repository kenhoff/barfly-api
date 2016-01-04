// hacky and gross. any way around this?
var jwtCheck = require('../jwtCheck.js');
var onConnect = require('../onConnect.js');
var getNextSequence = require('../getNextSequence.js');
var r = require('rethinkdb');


module.exports = function(app) {
	app.get("/bars/:barID", jwtCheck, function(req, res) {
		getUserBars(req.user.user_id, function(bars) {
			barID = parseInt(req.params.barID)
			if (bars.indexOf(barID) > -1) {
				onConnect(function(connection) {
					r.table("bars").get(parseInt(req.params.barID)).run(connection, function(err, result) {
						res.send(result)
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
				onConnect(function(connection) {
					r.table("orders").getAll(parseInt(req.params.barID), {
						index: "barID"
					}).run(connection, function(err, cursor) {
						cursor.toArray(function(err, results) {
							orders = []
							for (var i = 0; i < results.length; i++) {
								orders.push(results[i].id)
							}
							orders.sort()
							res.json(orders)
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
				onConnect(function(connection) {
					getNextSequence("orders", connection, function(newSeq) {
						r.table("orders").insert({
							id: newSeq,
							barID: parseInt(req.params.barID)
						}, {
							returnChanges: true
						}).run(connection, function(err, result) {
							res.json(result["changes"][0]["new_val"]["id"])
						})
					})
				})
			} else {
				res.sendStatus(401)
			}
		})
	})

}
