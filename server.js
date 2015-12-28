var app = require('express')();
var jwt = require('express-jwt');
var cors = require('cors');
var r = require('rethinkdb');
var fs = require('fs');
var bodyParser = require('body-parser');
var request = require('request');
port = process.env.PORT || 1310

var jwtCheck = jwt({
	secret: new Buffer('hkff8xzqlpnJMnywtfhM3YaNHLl-RGFlOYGrYqSKl41wxrXxVzcLEGyqt0ErqqPe', 'base64'),
	audience: 'JeIT5hdK0PXWuMVE1GSYbDT4Uw2HQpKx'
});


// cors lets us call api.barflyorders.com from barflyorders.com
app.use(cors())

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
	extended: false
}))

// parse application/json
app.use(bodyParser.json())

app.get("/", function(req, res) {
	res.send(200)
})

app.get("/user/bars", jwtCheck, function(req, res) {
	getUserBars(req.user.user_id, function(bars) {
		res.send(bars)
	})
})

app.post("/user/bars", jwtCheck, function(req, res) {
	// console.log(req.body);

	// validate name and zipcode
	zipCode = req.body.zipCode
	barName = req.body.barName

	re = /^\d{5}$/ig
	if (zipCode.match(re) && zipCode.match(re).length == 1) {
		// attempt to create the bar
		// first, get the latest "bars" sequence # from the "counters" table
		onConnect(function(connection) {
			getNextSequence("bars", connection, function(newSeq) {
				r.table("bars").insert({
					id: newSeq,
					barName: barName,
					zipCode: zipCode
				}).run(connection, function(err, result) {
					newBarID = newSeq
					addUserToBar(req.user.user_id, newBarID, function() {
						res.send({
							id: newSeq,
							barName: barName,
							zipCode: zipCode
						})
					})
				})
			})
		})
	} else {
		res.sendStatus(400)
	}
})

app.get("/bars/:barID", jwtCheck, function(req, res) {
	getUserBars(req.user.user_id, function(bars) {
		barID = parseInt(req.params.barID)
		if (bars.indexOf(barID) > -1) {
			onConnect(function(connection) {
				r.table("bars").get(parseInt(req.params.barID)).run(connection, function(err, result) {
					res.send(result)
				})
			})
		} else {
			res.sendStatus(401)
		}
	})
})

app.listen(port, function() {
	console.log("Listening on", port);
})

addUserToBar = function(userID, barID, cb) {
	onConnect(function(connection) {
		r.table("memberships").getAll(userID, {
			index: "userID"
		}).filter({
			barID: barID
		}).run(connection, function(err, cursor) {
			cursor.toArray(function(err, results) {
				if (results.length == 0) {
					r.table("memberships").insert({
						barID: barID,
						userID: userID,
						role: "manager"
					}).run(connection, function(err, result) {
						if (!err) {
							cb()
						} else {
							// throw something?
						}
					})
				}
			})
		})
	})
}

getUserBars = function(userID, cb) {

	// instead of getting the list of user bars from Auth0, we're gonna get the list of user bars from the "memberships" table

	onConnect(function(connection) {
		r.table("memberships").getAll(userID, {
			index: "userID"
		}).withFields("barID").run(connection, function(err, cursor) {
			cursor.toArray(function(err, results) {
				bars = []
				for (var i = 0; i < results.length; i++) {
					bars.push(results[i].barID)
				}
				cb(bars)
			})
		})
	})
}

getNextSequence = function(name, connection, cb) {
	r.table("counters").get(name).update({
		seq: r.row("seq").add(1)
	}, {
		returnChanges: true
	}).run(connection, function(err, result) {
		newSeq = result["changes"][0]["new_val"]["seq"]
		cb(newSeq)
	})
}

onConnect = function(cb) {
	// console.log("opening new connection");
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
			} else {
				throw "Database connection error"
			}
		})
	})
}
