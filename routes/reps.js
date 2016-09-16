var r = require('rethinkdb');
var onConnect = require('../onConnect.js');
// var getNextCounter = require('../getNextCounter.js');
var jwtCheck = require('../jwtCheck.js');
var request = require('request');
var async = require('async');

module.exports = function(app) {
	app.get("/reps", function(req, res) {
		// get all reps with a given distributor ID
		// which means, get all *distributor_memberships* where distributor == query param
		onConnect.connect(function(err, connection) {
			r.table("distributor_memberships").filter({
				distributorID: parseInt(req.query.distributorID)
			}).run(connection, function(err, cursor) {
				cursor.toArray(function(err, reps) {
					async.map(reps, function(rep, cb) {
						// get rep phone #
						request.get({
							url: "https://" + process.env.AUTH0_DOMAIN + "/api/v2/users/" + rep.repID,
							headers: {
								"Authorization": "Bearer " + process.env.AUTH0_API_JWT
							}
						}, function(err, response, body) {
							if (err) {
								cb(err);
							} else {
								var newRep = Object.assign({}, rep);
								if (("user_metadata" in JSON.parse(body)) && ("phone" in JSON.parse(body).user_metadata)) {
									newRep.repPhone = JSON.parse(body).user_metadata.phone;
								}
								cb(null, newRep);
							}
						});
					}, function(err, results) {
						if (err) {
							res.send(err);
						} else {
							res.json(results);
						}
					});
					connection.close();
				});
			});
		});
	});

	app.get("/reps/:repID", function(req, res) {
		// here, we need to call the Auth0 API to get the rep.
		request.get({
			url: "https://" + process.env.AUTH0_DOMAIN + "/api/v2/users/" + req.params.repID,
			headers: {
				"Authorization": "Bearer " + process.env.AUTH0_API_JWT
			},
			form: {}
		}, function(err, response, body) {
			if (err) {
				res.sendStatus(500);
			} else if (response.statusCode < 300) {
				res.json(JSON.parse(body));
			} else {
				res.sendStatus(500);
			}
		});

	});

	app.post("/reps", jwtCheck, function(req, res) {
		// here, we need to call the Auth0 API to create the rep.

		var repEmail = makePassword() + "@" + makePassword() + ".com";

		request.post({
			url: "https://" + process.env.AUTH0_DOMAIN + "/api/v2/users",
			headers: {
				"Authorization": "Bearer " + process.env.AUTH0_API_JWT
			},
			form: {
				"connection": "Username-Password-Authentication",
				"email": repEmail,
				"name": req.body.repName,
				"user_metadata": {
					"phone": req.body.repPhone,
					"name": req.body.repName
				},
				"password": makePassword()
			}
		}, function(err, response, body) {
			if (err) {
				res.status(500).send(err);
			} else if (response.statusCode < 300) {
				res.json(JSON.parse(body));
			} else {
				res.status(500).send(err);
			}
		});
	});

	app.patch("/reps/:repID", jwtCheck, function(req, res) {
		request.patch({
			url: "https://" + process.env.AUTH0_DOMAIN + "/api/v2/users/" + req.params.repID,
			headers: {
				"Authorization": "Bearer " + process.env.AUTH0_API_JWT
			},
			form: {
				"user_metadata": {
					"phone": req.body.repPhone,
					"name": req.body.repName
				}
			}
		}, function(err, response, body) {
			if (err) {
				res.status(500).send(err);
			} else if (response.statusCode < 300) {
				res.json(JSON.parse(body));
			} else {
				res.status(500).send(err);
			}
		});
	});

	app.post("/reps/:repID/memberships", jwtCheck, function(req, res) {
		onConnect.connect(function(err, connection) {
			// really should check and see if there's already a membership for this rep and distributor...
			r.table("distributor_memberships").insert({
				repID: req.params.repID,
				distributorID: parseInt(req.body.distributorID)
			}).run(connection, function() {
				res.sendStatus(200);
				connection.close();
			});
		});
	});

	function makePassword() {
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		for (var i = 0; i < 64; i++)
			text += possible.charAt(Math.floor(Math.random() * possible.length));

		return text;
	}
};
