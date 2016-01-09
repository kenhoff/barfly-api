var r = require('rethinkdb');

module.exports = function(name, connection, cb) {
	if (typeof name !== "string") {
		throw "Sequence ID string not provided as 1st argument"
	} else if (typeof connection !== "object") {
		throw "Connection object not provided as 2nd argument"
	} else if (typeof cb !== "function") {
		throw "Callback not provided as 3rd argument"
	} else {
		r.table("counters").get(name).update({
			seq: r.row("seq").add(1)
		}, {
			returnChanges: true
		}).run(connection, function(err, result) {
			newSeq = result["changes"][0]["new_val"]["seq"]
			cb(err, newSeq)
		})
	}
}
