// var r = require('rethinkdb')
// var onConnect = require('../onConnect.js')
// var getNextCounter = require('../getNextCounter.js')
var jwtCheck = require("../jwtCheck.js")
var request = require("request")


var stripe = require("stripe")(
	"sk_test_wjIDkyybByjHF1YTuxCMy7l8"
)

module.exports = function(app) {
	app.get("/paymentmethods", jwtCheck, function(req, res) {
		// have to deliberately look up app_metadata on Auth0 for user

		request.get({
			url: "https://" + process.env.AUTH0_DOMAIN + "/api/v2/users/" + req.user.sub,
			headers: {
				"Authorization": "Bearer " + process.env.AUTH0_API_JWT
			}
		}, function(err, response, body) {
			if (err) {
				res.status(500).send(err)
			} else {
				var user = JSON.parse(body)
				if (!("app_metadata" in user)) {
					res.json({})
				} else if (!("stripe_id" in user.app_metadata)) {
					res.json({})
				} else {
					stripe.customers.listCards(user.app_metadata.stripe_id, function(err, cards) {
						// asynchronously called
						if (err) {
							res.status(500).send(err)
						} else if (cards.data.length == 0) {
							res.json({})
						} else {
							res.json(cards.data[0])
						}
					})
				}
			}
		})
	})
}
