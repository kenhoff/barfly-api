var app = require('express')();
var jwt = require('express-jwt');
var cors = require('cors');
var r = require('rethinkdb');
var fs = require('fs');
port = process.env.PORT || 1310

var jwtCheck = jwt({
	secret: new Buffer('hkff8xzqlpnJMnywtfhM3YaNHLl-RGFlOYGrYqSKl41wxrXxVzcLEGyqt0ErqqPe', 'base64'),
	audience: 'JeIT5hdK0PXWuMVE1GSYbDT4Uw2HQpKx'
});


// cors lets us call api.barflyorders.com from barflyorders.com
app.use(cors())

app.get("/", function(req, res) {
	res.send(200)
})

app.get("/orders", jwtCheck, function(req, res) {
	onConnect(function (connection) {
		r.table('orders').filter(r.row('user').eq(req.user.user_id)).run(connection, function (err, cursor) {
			if (err) {
				throw err;
			}
			else {
				cursor.toArray(function (err, result) {
					if (err) throw err
					res.json(result)
				})
			}
		})
	})
})

app.post("/orders", jwtCheck, function (req, res) {
	userID = req.user.user_id
	onConnect(function (connection) {
		r.table('orders').insert({asdf:"1234", user: userID}).run(connection, function (err, result) {
			res.send(200)
		})
	})
})

app.listen(port, function() {
	console.log("Listening on", port);
})

onConnect = function (cb) {
	fs.readFile("./cacert", function(err, caCert) {
		r.connect({
			host: "aws-us-east-1-portal.9.dblayer.com",
			port: 10384,
			authKey: "auwvteoiuclrdkxjEofivucXKYESOalvkjcetdlfxkm",
			db: "barfly_production",
			ssl: {
				ca: caCert
			}
		}, function(err, conn) {
			if (!err) {
				cb(conn)
			}
			else {
				throw "Database connection error"
			}
		})
	})
}
