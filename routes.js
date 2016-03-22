var r = require('rethinkdb');
var fs = require('fs');
var onConnect = require('./onConnect.js');
var getNextCounter = require('./getNextCounter.js');
var jwtCheck = require('./jwtCheck.js');

module.exports = function(app) {
	app.get("/", function(req, res) {
		res.sendStatus(200);
	});
	require("./routes/bars")(app);
	require("./routes/orders")(app);

	require("./routes/accounts.js")(app);
	require("./routes/containers.js")(app);
	require("./routes/distributors.js")(app);
	require("./routes/invoices.js")(app);
	require("./routes/packaging.js")(app);
	require("./routes/paymentmethods.js")(app);
	require("./routes/products.js")(app);
	require("./routes/reps.js")(app);
	require("./routes/sizes.js")(app);
	require("./routes/subscriptions.js")(app);
	require("./routes/user.js")(app);
};
