var r = require('rethinkdb');
var onConnect = require('./onConnect.js')

module.exports.ensureTableExists = function(tableName, cb) {
	if (typeof tableName != "string") {
		throw "Missing table name"
	} else {
		onConnect.connect(function(connection) {
			r.tableList().run(connection, function(err, list) {
				if (err) {
					cb(err)
				} else if (list.length == 0) {
					// go ahead and create the table
					r.tableCreate(tableName).run(connection, function(err, result) {
						if (!err) {
							cb()
						} else {
							cb(err)
						}
					})
				} else if (list.indexOf(tableName) < 0) {
					r.tableCreate(tableName).run(connection, function(err, result) {
						if (!err) {
							cb()
						} else {
							cb(err)
						}
					})
				} else {
					cb()
				}

				// if list is empty,
			})
		})
	}
}
