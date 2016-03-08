var jwtCheck = require('../jwtCheck.js');
var request = require('request');


var stripe = require("stripe")(
	process.env.STRIPE_SECRET_KEY
);


module.exports = function(app) {
	app.get("/subscriptions", jwtCheck, function(req, res) {
		request.get({
			url: "https://" + process.env.AUTH0_DOMAIN + "/api/v2/users/" + req.user.sub,
			headers: {
				"Authorization": "Bearer " + process.env.AUTH0_API_JWT
			}
		}, function(err, response, body) {
			if (err) {
				res.status(500).send(err);
			} else {
				var user = JSON.parse(body);
				if (!("app_metadata" in user)) {
					res.json({});
				} else if (!("stripe_id" in user.app_metadata)) {
					res.json({});
				} else {
					stripe.customers.listSubscriptions(user.app_metadata.stripe_id, function(err, subscriptions) {
						if (err) {
							res.status(500).send(err);
						} else if (subscriptions.data.length == 0) {
							res.json({});
						} else {
							res.json(subscriptions.data[0]);
						}
					});
				}
			}
		});
	});
};
