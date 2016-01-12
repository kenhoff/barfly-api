require('dotenv').load()
var app = require('express')();
var jwt = require('express-jwt');
var cors = require('cors');
var bodyParser = require('body-parser');
var request = require('request');
port = process.env.PORT

// cors lets us call api.barflyorders.com from barflyorders.com
app.use(cors())

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
	extended: true
}))

// parse application/json
app.use(bodyParser.json())

// load all of our routes
require('./routes.js')(app);

app.listen(port, function() {
	console.log("Listening on", port);
})
