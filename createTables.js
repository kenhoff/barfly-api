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
	"zipcode_product_distributor"
]

async.map(tables, function(table, cb) {
	onConnect.connect(function(err, conn) {
		r.tableCreate(table).run(conn, function(err, result) {
			if (err) {
				console.log(table, "already exists");
				conn.close()
				cb()
			} else {
				console.log("Created", table);
				conn.close()
				cb()
			}
		})
	})
})
