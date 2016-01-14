var assert = require('chai').assert;
var sinon = require('sinon');

ensureTableExists = require("../ensureTableExists.js")

describe("ensureTableExists", function() {

	onConnect = require("../onConnect.js")
	r = require("rethinkdb")

	before(function() {
		sinon.stub(onConnect, "connect", function(cb) {
			cb("connection object")
		})
	})

	after(function() {
		onConnect.connect.restore()
		r.tableList.restore()
	})



	it("throws an err if no table name is provided", function(done) {
		try {
			ensureTableExists()
		} catch (e) {
			assert(e == "Missing table name", "err isn't populated")
			done()
		}
	})
	it("creates a new table if there are zero tables", function(done) {
		sinon.stub(r, "tableList", function() {
			return {
				run: function(connectionObject, cb) {
					cb(null, [])
				}
			}
		})

		ensureTableExists("testTable", function(err) {
			if (!err) {
				done()
			}
		})
	})

	it("creates a new table if there are no tables that match the name")

	it("doesn't modify the table if the table already exists")
})
