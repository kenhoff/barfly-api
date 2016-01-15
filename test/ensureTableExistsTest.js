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
	})

	it("throws an err if no table name is provided", function(done) {
		try {
			ensureTableExists.ensureTableExists()
		} catch (e) {
			assert(e == "Missing table name", "err isn't populated")
			done()
		}
	})

	it("creates a new table 'asdfasdfasdf' if there are zero tables", function(done) {
		sinon.stub(r, "tableList", function() {
			return {
				run: function(connectionObject, cb) {
					// no tables exist yet
					cb(null, [])
				}
			}
		})

		mock = sinon.mock(r)
		expectation = mock.expects("tableCreate")
		expectation.returns({
			run: function(connectionObject, cb) {
				cb(null, {
					"table created": "hooray!"
				})
			}
		})
		expectation.withArgs('asdfasdfasdf')

		ensureTableExists.ensureTableExists("asdfasdfasdf", function(err) {
			if (!err) {
				assert(expectation.withArgs('asdfasdfasdf').calledOnce, "tableCreate with arg 'asdfasdfasdf' wasn't called exactly once")
				r.tableList.restore()
				mock.restore()
				done()
			}
		})
	})


	it("creates a new table 'testTable' if there are zero tables", function(done) {
		sinon.stub(r, "tableList", function() {
			return {
				run: function(connectionObject, cb) {
					// no tables exist yet
					cb(null, [])
				}
			}
		})

		mock = sinon.mock(r)
		expectation = mock.expects("tableCreate")
		expectation.returns({
			run: function(connectionObject, cb) {
				cb(null, {
					"table created": "hooray!"
				})
			}
		})
		expectation.withArgs('testTable')

		ensureTableExists.ensureTableExists("testTable", function(err) {
			if (!err) {
				assert(expectation.withArgs('testTable').calledOnce, "tableCreate with arg 'testTable' wasn't called exactly once")
				r.tableList.restore()
				mock.restore()
				done()
			}
		})
	})

	it("creates a new table 'testTable' if there are no tables that match the name", function(done) {
		sinon.stub(r, "tableList", function() {
			return {
				run: function(connectionObject, cb) {
					// pump a bunch of other tables in there
					cb(null, ["testTable1", "testTable2", "testTable3"])
				}
			}
		})

		mock = sinon.mock(r)
		expectation = mock.expects("tableCreate")
		expectation.returns({
			run: function(connectionObject, cb) {
				cb(null, {
					"table created": "hooray!"
				})
			}
		})
		expectation.withArgs('testTable')

		ensureTableExists.ensureTableExists("testTable", function(err) {
			if (!err) {
				assert(expectation.withArgs('testTable').calledOnce, "tableCreate with arg 'testTable' wasn't called exactly once")
				r.tableList.restore()
				mock.restore()
				done()
			}
		})
	})
	it("doesn't call tableCreate if the table already exists", function(done) {
		sinon.stub(r, "tableList", function() {
			return {
				run: function(connectionObject, cb) {
					// pump a bunch of other tables in there
					cb(null, ["testTable1", "testTable2", "testTable3"])
				}
			}
		})

		spy = sinon.spy(r, "tableCreate")

		ensureTableExists.ensureTableExists("testTable1", function(err) {
			assert(!err, "err: " + err)
			if (!err) {
				assert(spy.callCount == 0, "tableCreate was called")
				r.tableList.restore()
				r.tableCreate.restore()
				done()
			}
		})

	})
	it("calls back with 'Database connection error' if onConnect can't connect to the database")
	it("bubbles up tableList err", function(done) {
		sinon.stub(r, "tableList", function() {
			return {
				run: function(connectionObject, cb) {
					// pump a bunch of other tables in there
					cb("welp, if you're gonna have an ass-error")
				}
			}
		})

		spy = sinon.spy(r, "tableCreate")


		ensureTableExists.ensureTableExists("testTable1", function(err) {
			assert(err == "welp, if you're gonna have an ass-error", "wrong err!")
			assert(spy.callCount == 0, "tableCreate was called :(")
			r.tableList.restore()
			r.tableCreate.restore()
			done()
		})
	})
	it("bubbles up tableCreate err", function (done) {
		sinon.stub(r, "tableList", function() {
			return {
				run: function(connectionObject, cb) {
					// pump a bunch of other tables in there
					cb(null, [])
				}
			}
		})

		sinon.stub(r, "tableCreate", function () {
			return {
				run: function (connectionObject, cb) {
					cb("ya might as well have a random ass-error")
				}
			}
		})

		ensureTableExists.ensureTableExists("testTable1", function(err) {
			assert(err == "ya might as well have a random ass-error", "wrong err!")
			r.tableList.restore()
			r.tableCreate.restore()
			done()
		})

	})
})
