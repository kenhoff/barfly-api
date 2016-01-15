var assert = require('chai').assert;
var sinon = require('sinon');
var r = require('rethinkdb');
onConnect = require("../onConnect.js")


describe("onConnectTest", function() {
	it("calls back with a conn when successfully connecting to the db", function(done) {
		sinon.stub(r, "connect", function(opts, cb) {
			cb(null, {
				"connection": "object"
			})
		})

		onConnect.connect(function (err, connection) {
			assert(!err)
			r.connect.restore()
			done()
		})
	})

	it("calls back with the err if connecting to the db throws an err", function (done) {
		sinon.stub(r, "connect", function(opts, cb) {
			cb("Oh shit, we couldn't connect to the database")
		})

		onConnect.connect(function (err, connection) {
			assert(err == "Oh shit, we couldn't connect to the database")
			r.connect.restore()
			done()
		})
	})
})
