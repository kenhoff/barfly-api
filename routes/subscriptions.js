var jwtCheck = require('../jwtCheck.js');
var request = require('request');
var async = require('async');



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

	app.post("/subscriptions", jwtCheck, function(req, res) {
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
				if (!("app_metadata" in user) || !("stripe_id" in user.app_metadata)) {
					// create new user with new subscription, save stripe_id to user
					stripe.customers.create({
						description: user.name,
						plan: "standard"
					}, function(err, customer) {
						if (err) {
							res.status(500).send(err);
						} else {
							request.patch({
								url: "https://" + process.env.AUTH0_DOMAIN + "/api/v2/users/" + req.user.sub,
								headers: {
									"Authorization": "Bearer " + process.env.AUTH0_API_JWT
								},
								form: {
									app_metadata: {
										stripe_id: customer.id
									}
								}
							}, function(err) {
								if (err) {
									res.status(500).send(err);
								} else {
									res.sendStatus(200);
								}
							});
						}
					});
				}
			}
		});
	});
	app.delete("/subscriptions", jwtCheck, function(req, res) {
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
				if (!("app_metadata" in user) || !("stripe_id" in user.app_metadata)) {
					res.sendStatus(200);
				} else {
					stripe.customers.listSubscriptions(user.app_metadata.stripe_id, function(err, subscriptions) {
						if (err) {
							res.status(500).send(err);
						} else if (subscriptions.data.length == 0) {
							res.sendStatus(200);
						} else {
							async.map(subscriptions.data, function(subscription, cb) {
								if (subscription.status == "trialing") {
									// set subscription to end at the end of the trial
									stripe.customers.cancelSubscription(user.app_metadata.stripe_id, subscription.id, {
										at_period_end: true
									}, function(err) {
										if (err) {
											cb(err);
										} else {
											cb();
										}
									});
								} else if (subscription.status == "active") {
									stripe.customers.cancelSubscription(user.app_metadata.stripe_id, subscription.id, function(err) {
										if (err) {
											cb(err);
										} else {
											cb();
										}
									});
								} else {
									cb();
								}
							}, function(err) {
								if (err) {
									res.status(500).send(err);
								} else {
									res.sendStatus(200);
								}
							});
						}
					});
				}
			}
		});
	});

};
