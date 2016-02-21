var jwtCheck = require('../../../jwtCheck.js');
var onConnect = require('../../../onConnect.js');
var getNextCounter = require('../../../getNextCounter.js');
var r = require('rethinkdb');

module.exports = function(app) {
	app.get("/bars/:barID/starred", jwtCheck, function(req, res) {
		// just get all starred items for a bar with barID = req.params.barID
		getUserBars(req.user.user_id, function(bars) {
			barID = parseInt(req.params.barID)
			if (bars.indexOf(barID) > -1) {
				onConnect.connect(function(err, connection) {
					r.table("starred").filter({
						barID: parseInt(req.params.barID)
					}).run(connection, function(err, cursor) {
						cursor.toArray(function(err, results) {
							res.json(results)
						})
					})
				})
			} else {
				res.sendStatus(401)
			}
		})
	})

	app.post("/bars/:barID/starred", jwtCheck, function(req, res) {
		// req.body must contain a sizeID and productID
		if (("sizeID" in req.body) && ("productID" in req.body)) {
			// if so, then just insert a new record in the starred table with barID, sizeID and productID
			getUserBars(req.user.user_id, function(bars) {
				barID = parseInt(req.params.barID)
				if (bars.indexOf(barID) > -1) {
					onConnect.connect(function(err, connection) {
						getNextCounter("starred", connection, function(err, newCounter) {
							r.table("starred").insert({
								barID: parseInt(req.params.barID),
								sizeID: parseInt(req.body.sizeID),
								productID: parseInt(req.body.productID),
								id: newCounter
							}).run(connection, function(err, result) {
								res.json(result)
							})
						})
					})
				} else {
					res.sendStatus(401)
				}
			})
		} else {
			res.sendStatus(400)
		}
	})

	app.delete("/bars/:barID/starred", jwtCheck, function(req, res) {
		// req.body (?) must contain a sizeID and productID
		console.log(req.body);
		// if so, then just delete the record that matches that barID, sizeID and productID
		if (("sizeID" in req.body) && ("productID" in req.body)) {
			// if so, then just insert a new record in the starred table with barID, sizeID and productID
			getUserBars(req.user.user_id, function(bars) {
				barID = parseInt(req.params.barID)
				if (bars.indexOf(barID) > -1) {
					onConnect.connect(function(err, connection) {
						r.table("starred").filter({
							barID: parseInt(req.params.barID),
							sizeID: parseInt(req.body.sizeID),
							productID: parseInt(req.body.productID)
						}).delete().run(connection, function(err, result) {
							res.json(result)
						})
					})
				} else {
					res.sendStatus(401)
				}
			})
		} else {
			res.sendStatus(400)
		}
	})
}
