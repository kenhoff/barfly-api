var jwtCheck = require('../jwtCheck.js');
// var request = require('request');
// var async = require('async');

var stripe = require("stripe")(
	process.env.STRIPE_SECRET_KEY
);


module.exports = function(app) {
	app.get("/invoices", jwtCheck, function(req, res) {
		stripe.invoices.list({
			customer: req.user.app_metadata.stripe_id,
			limit: 1
		}, function(err, invoices) {
			if (err) {
				res.status(500).send(err);
			} else {
				// just for testing
				invoices.data[0].paid = false;
				invoices.data[0].amount_due = 3000;
				res.status(200).send(invoices.data[0]);
			}
		});
	});
};
