var r = require('rethinkdb');
var onConnect = require('./onConnect.js');

module.exports = function(name, connection, cb) {
	if (typeof name !== "string") {
		throw "Sequence ID string not provided as 1st argument"
	} else if (typeof connection !== "object") {
		throw "Connection object not provided as 2nd argument"
	} else if (typeof cb !== "function") {
		throw "Callback not provided as 3rd argument"
	} else {
		ensureCounterExists(name, function() {
			r.table("counters").get(name).update({
				seq: r.row("seq").add(1)
			}, {
				returnChanges: true
			}).run(connection, function(err, result) {
				newCounter = result["changes"][0]["new_val"]["seq"]
				cb(err, newCounter)
			})
		})
	}
}

ensureCounterExists = function(counterName, cb) {
	if (!counterName) {
		return cb("Counter name not provided")
	} else {
		onConnect.connect(function(err, connection) {
			r.table('counters').get(counterName).run(connection, function(err, result) {
				if (!err && !result) {
					r.table('counters').insert({
						id: counterName,
						seq: 0
					}).run(connection, function(err, result) {
						cb(err)
						connection.close()
					})
				} else {
					cb(err)
					connection.close()
				}
			})
		})
	}
}
