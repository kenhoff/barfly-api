var r = require('rethinkdb');
var onConnect = require('./onConnect.js')

module.exports = function(tableName, cb) {
	if (typeof tableName != "string") {
		throw "Missing table name"
	} else {
		onConnect.connect(function(connection) {
			r.tableList().run(connection, function(err, list) {
				if (list.length == 0) {
					// go ahead and create the table
				}

				// if list is empty,
			})
		})
	}
}
