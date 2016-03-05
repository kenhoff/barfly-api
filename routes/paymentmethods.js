// var r = require('rethinkdb')
// var onConnect = require('../onConnect.js')
// var getNextCounter = require('../getNextCounter.js')
var jwtCheck = require("../jwtCheck.js")


module.exports = function(app) {
	app.get("/paymentmethods", jwtCheck, function(req, res) {
		if (!("app_metadata" in req.user)) {
			res.json({})
		} else if (!("stripe_id" in req.user.app_metadata)) {
			res.json({})
		}
	})
}
