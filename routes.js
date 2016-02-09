var r = require('rethinkdb');
var fs = require('fs');

var onConnect = require('./onConnect.js');
var getNextCounter = require('./getNextCounter.js');

var jwtCheck = require('./jwtCheck.js');

module.exports = function(app) {

	app.get("/", function(req, res) {
		res.send(200)
	})

	require("./routes/user.js")(app)
	require("./routes/bars.js")(app)
	require("./routes/products.js")(app)
	require("./routes/sizes.js")(app)
	require("./routes/orders")(app)
	require("./routes/distributors.js")(app)
	require("./routes/accounts.js")(app)
	require("./routes/reps.js")(app)
	require("./routes/containers.js")(app)

}
