// var r = require('rethinkdb')
// var onConnect = require('../onConnect.js')
// var getNextCounter = require('../getNextCounter.js')
var jwtCheck = require("../jwtCheck.js");
var request = require("request");
var async = require("async");


var stripe = require("stripe")(
	process.env.STRIPE_SECRET_KEY
);

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
				res.status(500).send(err);
			} else {
				var user = JSON.parse(body);
				if (!("app_metadata" in user)) {
					res.json({});
				} else if (!("stripe_id" in user.app_metadata)) {
					res.json({});
				} else {
					stripe.customers.listCards(user.app_metadata.stripe_id, function(err, cards) {
						// asynchronously called
						if (err) {
							res.status(500).send(err);
						} else if (cards.data.length == 0) {
							res.json({});
						} else {
							res.json(cards.data[0]);
						}
					});
				}
			}
		});
	});

	app.post("/paymentmethods", jwtCheck, function(req, res) {
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

				// if a user doesn't already have a stripe id
				if (!("app_metadata" in user) || !("stripe_id" in user.app_metadata)) {
					// create stripe user, save to user.app_metadata
					stripe.customers.create({
						description: user.user_metadata.name,
						source: req.body.token.id
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
				} else {
					// if a user does already have a stripe id, get user's cards
					stripe.customers.listCards(user.app_metadata.stripe_id, function(err, cards) {
						// asynchronously called
						if (err) {
							res.status(500).send(err);
						} else if (cards.data.length == 0) {
							// if user has no cards, just add a new one
							stripe.customers.createSource(user.app_metadata.stripe_id, {
								source: req.body.token.id
							}, function(err) {
								if (err) {
									res.status(500).send(err);
								} else {
									res.sendStatus(200);
								}
							});
						} else {
							// if user has cards, delete old cards, then add new one
							async.each(cards.data, function(card, cb) {
								// delete card, call cb
								stripe.customers.deleteCard(user.app_metadata.stripe_id, card.id, function(err) {
									cb(err);
								});
							}, function(err) {
								if (err) {
									res.status(500).send(err);
								} else {
									// add new card
									stripe.customers.createSource(user.app_metadata.stripe_id, {
										source: req.body.token.id
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
					});

				}

			}
		});
	});

	app.delete("/paymentmethods", jwtCheck, function(req, res) {
		// if user doesn't have app_metadata, or if user doesn't have a stripe_id in app_metadata, don't do anything

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

				// if a user doesn't have app_metadata or stripe_id
				if (!("app_metadata" in user) || !("stripe_id" in user.app_metadata)) {
					res.sendStatus(200);
				} else {
					// if so, check and see if user's got any cards
					stripe.customers.listCards(user.app_metadata.stripe_id, function(err, cards) {
						if (err) {
							res.status(500).send(err);
						} else if (cards.data.length == 0) {
							// if user has no cards, nothing to do
							res.sendStatus(200);
						} else {
							// if user has cards, delete them
							async.each(cards.data, function(card, cb) {
								// delete card, call cb
								stripe.customers.deleteCard(user.app_metadata.stripe_id, card.id, function(err) {
									cb(err);
								});
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
