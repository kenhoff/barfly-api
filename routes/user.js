var jwtCheck = require('../jwtCheck.js');
// hacky and gross. any way around this?

var onConnect = require('../onConnect.js');
var getNextSequence = require('../getNextSequence.js');
var r = require('rethinkdb');

module.exports = function (app) {
	app.get("/user/bars", jwtCheck, function(req, res) {
		getUserBars(req.user.user_id, function(bars) {
			res.send(bars)
		})
	})

	app.post("/user/bars", jwtCheck, function(req, res) {
		// console.log(req.body);

		// validate name and zipcode
		zipCode = req.body.zipCode
		barName = req.body.barName

		re = /^\d{5}$/ig
		if (zipCode.match(re) && zipCode.match(re).length == 1) {
			// attempt to create the bar
			// first, get the latest "bars" sequence # from the "counters" table
			onConnect(function(connection) {
				getNextSequence("bars", connection, function(newSeq) {
					r.table("bars").insert({
						id: newSeq,
						barName: barName,
						zipCode: zipCode
					}).run(connection, function(err, result) {
						newBarID = newSeq
						addUserToBar(req.user.user_id, newBarID, function() {
							res.send({
								id: newSeq,
								barName: barName,
								zipCode: zipCode
							})
						})
					})
				})
			})
		} else {
			res.sendStatus(400)
		}
	})
}
