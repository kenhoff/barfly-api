var assert = require('chai').assert;
var sinon = require('sinon');

var getNextCounter = require('../getNextCounter');

describe('getNextCounter', function() {
	var r = require('rethinkdb');
	connectionObject = {
		connection: ["stuff", "goes", "here"]
	}
	before(function() {
		sinon.stub(r, "table").returns({
			get: function() {
				return {
					update: function() {
						return {
							run: function(conn, cb) {
								cb(null, {
									changes: [{
										new_val: {
											seq: 10
										}
									}]
								})
							}
						}
					}
				}
			}
		})
	})

	it.skip('should call back with a new sequence when everything is provided', function(done) {
		getNextCounter("testing", connectionObject, function(err, newSeq) {
			assert(!err, "cb was called with an err")
			assert((newSeq == 10), "newSeq != 10")
			done()
		})
	})

	it("should throw an err when anything but a string is provided as the 1st argument", function(done) {
		try {
			getNextCounter({
				someWeird: "object"
			}, connectionObject, function(err, result) {})
		} catch (e) {
			assert(e == "Sequence ID string not provided as 1st argument")
			done()
		}
	})

	it("should throw an err when anything but an object is provided as the 2nd argument", function(done) {
		try {
			getNextCounter("testing", "asdfasdfasdf", function(err, result) {})
		} catch (e) {
			assert(e == "Connection object not provided as 2nd argument")
			done()
		}
	})

	it("should throw an err when a callback isn't provided as the 3rd argument", function(done) {
		try {
			getNextCounter("testing", connectionObject)
		} catch (e) {
			assert(e == "Callback not provided as 3rd argument")
			done()
		}
	})

	it("increments existing counter by 1", function(done) {
		r.table.restore()
		sinon.stub(r, "table").returns({
			get: function() {
				return {
					update: function() {
						return {
							run: function(conn, cb) {
								cb(null, {
									changes: [{
										new_val: {
											seq: 11
										}
									}]
								})
							}
						}
					},
					run: function(conn, cb) {
						cb(null, 10)
					}
				}
			}
		})
		getNextCounter("testCounter", connectionObject, function(err, newSeq) {
			// should really also assert that update was called with the correct args
			assert(!err)
			assert(newSeq == 11, "new sequence was not incremented correctly")
			r.table.restore()
			done()
		})
	})

	it("if sequence doesn't exist, creates it, and calls back with 1", function (done) {
		sinon.stub(r, "table").returns({
			get: function() {
				return {
					update: function() {
						return {
							run: function(conn, cb) {
								cb(null, {
									changes: [{
										new_val: {
											seq: 1
										}
									}]
								})
							}
						}
					},
					run: function(conn, cb) {
						cb(null, null)
					}
				}
			},
			insert: function (counterObject) {
				return {
					run: function (connectionObject, cb) {
						cb(null)
					}
				}
			}
		})
		getNextCounter("testCounter", connectionObject, function (err, newSeq) {
			// again, should really assert that get, insert, and update were all called with the correct params
			assert(!err)
			assert(newSeq == 1)
			r.table.restore()
			done()
		})
	})


})
