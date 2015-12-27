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

app.get("/user/bars", jwtCheck, function (req, res) {
	getUserBars(req.user.user_id, function (bars) {
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
					getUserBars(req.user.user_id, function(bars) {
						bars.push(newBarID)
						saveUserBars(req.user.user_id, bars, function() {
							res.send({
								id: newSeq,
								barName: barName,
								zipCode: zipCode
							})
						})
					})
				})
			})
		})
	} else {
		res.sendStatus(400)
	}
})

app.get("/bars/:barID", jwtCheck, function (req, res) {
	console.log("got request for bar", req.params.barID, "at", Date.now());
	getUserBars(req.user.user_id, function (bars) {
		barID = parseInt(req.params.barID)
		if (bars.indexOf(barID) > -1) {
			console.log("found bar", barID, ", calling onConnect");
			onConnect(function (connection) {
				// console.log(connection);
				console.log("connection successful, looking up bar", req.params.barID);
				r.table("bars").get(parseInt(req.params.barID)).run(connection, function (err, result) {
					console.log(result);
					res.send(result)
				})
			})
		}
		else {
			res.sendStatus(401)
		}
	})
})

app.listen(port, function() {
	console.log("Listening on", port);
})

saveUserBars = function(user_id, bars, cb) {
	AUTH0_URL = "https://barfly.auth0.com"

	opts = {
		url: AUTH0_URL + "/api/v2/users/" + user_id,
		method: "PATCH",
		headers: {
			"Authorization": "Bearer " + "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJwS1J5S2J3dzVPRzRVVUIzdG5LYWJHZ1hqSTJDMnVNQiIsInNjb3BlcyI6eyJ1c2VycyI6eyJhY3Rpb25zIjpbInJlYWQiXX0sInVzZXJzX2FwcF9tZXRhZGF0YSI6eyJhY3Rpb25zIjpbInVwZGF0ZSJdfX0sImlhdCI6MTQ1MDczNjExOSwianRpIjoiODllNTMzOWZjZmJiNDE2MzE0OWE0NDUxMTg0MGIyNjEifQ.MErq5h8dzIrFRXlpPNznATXY4Gjv5jGKr9Mccrb8n1c"
		},
		body: {
			"app_metadata": {
				"bars": bars
			}
		},
		json: true
	}
	request(opts, function(err, response, body) {
		cb()
	})
}

getUserBars = function(user_id, cb) {

	AUTH0_URL = "https://barfly.auth0.com"

	opts = {
		url: AUTH0_URL + "/api/v2/users/" + user_id,
		headers: {
			"Authorization": "Bearer " + "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJwS1J5S2J3dzVPRzRVVUIzdG5LYWJHZ1hqSTJDMnVNQiIsInNjb3BlcyI6eyJ1c2VycyI6eyJhY3Rpb25zIjpbInJlYWQiXX19LCJpYXQiOjE0NTA3MzU2NTIsImp0aSI6IjQ1ZTliMzIyZGFlMjkxYTlkM2RkNWExMzA1NzIzOTA4In0.jyxlkgFE9H1Xfrd_ubcvBt5LPL02HmJowLfkPKHqjyo"
		}
	}
	request(opts, function(err, response, body) {
		if (!(JSON.parse(body).app_metadata)) {
			cb([])
		} else {
			cb(JSON.parse(body).app_metadata.bars);
		}
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
