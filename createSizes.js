if (process.env.NODE_ENV != "production") {
	require('dotenv').load()
}

var onConnect = require('./onConnect.js');
var r = require('rethinkdb');
var async = require('async');

// DO NOT CHANGE THE ORDER OF THESE
// just add new ones to the end
containers = [
	"11.2oz BTL",
	"12oz CAN",
	"12oz BTL",
	"16oz ALUM BTL",
	"18.6oz BTL",
	"20.3oz BTL",
	"21.3oz BTL",
	"21.4oz BTL",
	"21.6oz BTL",
	"24oz CAN",
	"25.4oz CAN"
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
	"Pack of 6",
	"Pack of 12",
	"Pack of 24",
	"Pack of 30"
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
