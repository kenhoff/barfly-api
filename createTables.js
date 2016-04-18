if (process.env.NODE_ENV != "production") {
	require('dotenv').load()
}

var onConnect = require('./onConnect.js');
var r = require('rethinkdb');
var async = require('async');

tables = [
	"accounts",
	"bar_memberships",
	"bars",
	"counters",
	"distributor_memberships",
	"distributors",
	"orders",
	"product_orders",
	"products",
	"sizes",
	"zipcode_product_distributor",
	"containers",
	"packaging",
	"starred"
]

onConnect.connect(function(err, connection) {
	async.each(tables, function(table, cb) {
		r.tableCreate(table).run(connection, function(err, result) {
			if (err) {
				console.log(table, "already exists");
				cb()
			} else {
				console.log("Created", table);
				cb()
			}
		})
	}, function(err) {
		if (err) {
			throw err
			process.exit(1)
		} else {
			console.log("done creating tables")
			connection.close()
			process.exit(0)
		}
	})
})
