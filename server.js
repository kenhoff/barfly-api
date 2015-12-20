var app = require('express')();
var jwt = require('express-jwt');
var cors = require('cors');
port = process.env.PORT || 1310

var jwtCheck = jwt({
	secret: new Buffer('hkff8xzqlpnJMnywtfhM3YaNHLl-RGFlOYGrYqSKl41wxrXxVzcLEGyqt0ErqqPe', 'base64'),
	audience: 'JeIT5hdK0PXWuMVE1GSYbDT4Uw2HQpKx'
});

// cors lets us call api.barflyorders.com from barflyorders.com
app.use(cors())

app.get("/", function (req, res) {
	res.send(200)
})

app.get("/orders", jwtCheck, function (req, res) {
	console.log("got request for orders");
	res.json({orders: "very yes"})
})

app.listen(port, function () {
	console.log("Listening on", port);
})
