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
							// just for testing:
							// subscriptions.data[0].status = "past_due";
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
					// we haven't created a stripe customer for this user
					// create new user with new subscription, save stripe_id to user
					stripe.customers.create({
						description: user.user_metadata.name,
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
										stripe_id: customer.id,
										startedTrial: true
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
				} else {
					// check and see if our user already has any subscriptions
					stripe.customers.listSubscriptions(user.app_metadata.stripe_id, function(err, subscriptions) {
						if (subscriptions.data.length != 0) {
							// if so, check each subscription
							async.map(subscriptions.data, function(subscription, cb) {
								if (subscription.status == "trialing" && subscription.cancel_at_period_end) {
									// if it's an trial subscription, set it not to expire
									stripe.customers.updateSubscription(user.app_metadata.stripe_id, subscription.id, {
										plan: "standard"
									}, function(err) {
										if (err) {
											cb(err);
										} else {
											request.patch({
												url: "https://" + process.env.AUTH0_DOMAIN + "/api/v2/users/" + req.user.sub,
												headers: {
													"Authorization": "Bearer " + process.env.AUTH0_API_JWT
												},
												form: {
													app_metadata: {
														startedTrial: true
													}
												}
											}, function(err) {
												cb(err);
											});
										}
									});
								}
							}, function(err) {
								if (err) {
									res.status(500).send(err);
								} else {
									res.sendStatus(200);
								}
							});
						} else {
							// if no subscriptions, check "startedTrial" flag on user object
							if (!("startedTrial" in user.app_metadata) || (!user.app_metadata.startedTrial)) {
								// If no "startedTrial" flag, or if "startedTrial" is false, create a new subscription with trial
								stripe.customers.createSubscription(user.app_metadata.stripe_id, {
									plan: "standard"
								}, function(err) {
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
													startedTrial: true
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
							} else {
								// If "startedTrial", attempt to create a new subscription with no trial.
								stripe.customers.createSubscription(user.app_metadata.stripe_id, {
									plan: "standard",
									trial_end: "now"
								}, function(err) {
									if (err) {
										res.status(500).send(err);
									} else {
										res.sendStatus(200);
									}
								});
							}
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
