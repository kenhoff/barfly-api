var jwtCheck = require('../jwtCheck.js');
var request = require('request');
// var async = require('async');

var stripe = require("stripe")(
	process.env.STRIPE_SECRET_KEY
);


module.exports = function(app) {
	app.get("/invoices", jwtCheck, function(req, res) {

		// look up user
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
				if (("app_metadata" in user) && ("stripe_id" in user.app_metadata)) {
					stripe.invoices.list({
						customer: user.app_metadata.stripe_id,
						limit: 1
					}, function(err, invoices) {
						if (err) {
							res.status(500).send(err);
						} else {
							if (invoices.data.length != 0) {
								// just for testing
								invoices.data[0].paid = false;
								invoices.data[0].amount_due = 3000;
								res.status(200).send(invoices.data[0]);
							} else {
								res.status(200).send({});
							}
						}
					});
				} else {
					res.status(200).send({});
				}
			}
		});
	});
	app.post("/invoices", jwtCheck, function(req, res) {
		// look up user
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
				if (("app_metadata" in user) && ("stripe_id" in user.app_metadata)) {
					stripe.invoices.list({
						customer: user.app_metadata.stripe_id,
						limit: 1
					}, function(err, invoices) {
						if (err) {
							res.status(500).send(err);
						} else {
							stripe.invoices.pay(invoices.data[0].id, function(err) {
								if (err) {
									res.status(500).send(err);
								} else {
									res.sendStatus(200);
								}
							})
						}
					});
				} else {
					res.sendStatus(200);
				}
			}
		});
	});
};
