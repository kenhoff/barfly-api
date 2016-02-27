if (process.env.NODE_ENV != "production") {
	require('dotenv').load()
}

var onConnect = require('./onConnect.js');
var r = require('rethinkdb');
var async = require('async');

// DO NOT CHANGE THE ORDER OF THESE
// just add new ones to the end
containers = [
	"11.2oz bottle",
	"12oz can",
	"12oz bottle",
	"16oz aluminum bottle",
	"18.6oz bottle",
	"20.3oz bottle",
	"21.3oz bottle",
	"21.4oz bottle",
	"21.6oz bottle",
	"24oz can",
	"25.4oz can",
	"Keg (5 gallon)",
	"Keg (1/4 barrel)",
	"Keg (1/2 barrel)",
	"750ml bottle",
	"1 ltr bottle",
	"1.75 ltr bottle",
]

onConnect.connect(function(err, connection) {
	containerCount = 0
	async.eachSeries(containers, function(containerSize, cb) {
		r.table("containers").insert({
			containerName: containerSize,
			id: containerCount
		}, {
			conflict: "replace"
		}).run(connection, function(err, result) {
			containerCount += 1
			if (err) {
				throw err
			} else {
				console.log("Inserted", containerSize);
				cb()
			}
		})
	}, function(err) {
		if (err) {
			throw err
		} else {
			console.log("done inserting containers");
			connection.close()
		}
	})
})

// DO NOT CHANGE THE ORDER OF THESE
// just add new ones to the end
packaging = [
	"Individual",
	"Case of 6",
	"Case of 12",
	"Case of 24",
	"Case of 30"
]

onConnect.connect(function(err, connection) {
	packagingCount = 0
	async.eachSeries(packaging, function(packagingSize, cb) {
		r.table("packaging").insert({
			packagingName: packagingSize,
			id: packagingCount
		}, {
			conflict: "replace"
		}).run(connection, function(err, result) {
			packagingCount += 1
			if (err) {
				throw err
			} else {
				console.log("Inserted", packagingSize);
				cb()
			}
		})
	}, function(err) {
		if (err) {
			throw err
		} else {
			console.log("done inserting packaging");
			connection.close()
		}
	})
})
