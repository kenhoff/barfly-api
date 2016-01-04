var r = require('rethinkdb');

module.exports = function(name, connection, cb) {
	r.table("counters").get(name).update({
		seq: r.row("seq").add(1)
	}, {
		returnChanges: true
	}).run(connection, function(err, result) {
		newSeq = result["changes"][0]["new_val"]["seq"]
		cb(newSeq)
	})
}
