var r = require('rethinkdb');
var onConnect = require('../onConnect.js');
var getNextSequence = require('../getNextSequence.js');
var jwtCheck = require('../jwtCheck.js');
var request = require('request');

module.exports = function(app) {
	app.get("/reps", function(req, res) {
		// get all reps with a given distributor ID
		// which means, get all *distributor_memberships* where distributor == query param
		onConnect(function(connection) {
			r.table("distributor_memberships").filter({
				distributorID: parseInt(req.query.distributorID)
			}).run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					res.json(results)
				})
			})
		})
	})

	app.get("/reps/:repID", function (req, res) {
		// here, we need to call the Auth0 API to get the rep.
		request.get({
			url: "https://barfly.auth0.com/api/v2/users/" + req.params.repID,
			headers: {
				"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJwS1J5S2J3dzVPRzRVVUIzdG5LYWJHZ1hqSTJDMnVNQiIsInNjb3BlcyI6eyJ1c2VycyI6eyJhY3Rpb25zIjpbInJlYWQiXX19LCJpYXQiOjE0NTIyNzM1NjQsImp0aSI6IjA5Nzg5ZTI0NDBiNDI2OGEwZGVlM2M5NTk2NzlmYWUyIn0.hvNLp9bXGC0Mie_hjW505GKS7kvD5r6SdYY5QshbgL0"
			},
			form: {}
		}, function(err, response, body) {
			if (err) {
				res.sendStatus(500)
			} else if (response.statusCode < 300) {
				res.json(JSON.parse(body))
			} else {
				res.sendStatus(500)
			}
		})

	})

	app.post("/reps", jwtCheck, function(req, res) {
		// here, we need to call the Auth0 API to create the rep.
		request.post({
			url: "https://barfly.auth0.com/api/v2/users",
			headers: {
				"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJwS1J5S2J3dzVPRzRVVUIzdG5LYWJHZ1hqSTJDMnVNQiIsInNjb3BlcyI6eyJ1c2VycyI6eyJhY3Rpb25zIjpbImNyZWF0ZSJdfX0sImlhdCI6MTQ1MjIyNTI3OSwianRpIjoiMDQ5Mjg0ODFhYjkwNjY1MzMzYzM3MDM4Nzc5YzUxY2MifQ.fMOk3ef5PLJSjC3Y-vOUlZI84qMDg6Ke6xRPVzOghXk"
			},
			form: {
				"connection": "Username-Password-Authentication",
				"email": req.body.repEmail,
				"name": req.body.repName,
				"user_metadata": {
					"phone": req.body.repPhone
				},
				"password": makePassword()
			}
		}, function(err, response, body) {
			if (err) {
				res.sendStatus(500)
			} else if (response.statusCode < 300) {
				res.json(JSON.parse(body))
			} else {
				res.sendStatus(500)
			}
		})
	})

	app.post("/reps/:repID/memberships", jwtCheck, function(req, res) {
		onConnect(function(connection) {
			// really should check and see if there's already a membership for this rep and distributor...
			r.table("distributor_memberships").insert({
				repID: req.params.repID,
				distributorID: parseInt(req.body.distributorID)
			}).run(connection, function(err, result) {
				res.sendStatus(200)
			})
		})
	})

	function makePassword() {
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		for (var i = 0; i < 64; i++)
			text += possible.charAt(Math.floor(Math.random() * possible.length));

		return text;
	}
}
