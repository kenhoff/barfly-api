var assert = require('chai').assert;
var sinon = require('sinon');

var getNextSequence = require('../getNextSequence');

describe('getNextSequence', function() {
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

	it('should call back with a new sequence when everything is provided', function(done) {
		getNextSequence("testing", connectionObject, function(err, newSeq) {
			assert(!err, "cb was called with an err")
			assert((newSeq == 10), "newSeq != 10")
			done()
		})
	})

	it("should throw an err when anything but a string is provided as the 1st argument", function(done) {
		try {
			getNextSequence({
				someWeird: "object"
			}, connectionObject, function(err, result) {})
		} catch (e) {
			assert(e == "Sequence ID string not provided as 1st argument")
			done()
		}
	})

	it("should throw an err when anything but an object is provided as the 2nd argument", function(done) {
		try {
			getNextSequence("testing", "asdfasdfasdf", function(err, result) {})
		} catch (e) {
			assert(e == "Connection object not provided as 2nd argument")
			done()
		}
	})

	it("should throw an err when a callback isn't provided as the 3rd argument", function(done) {
		try {
			getNextSequence("testing", connectionObject)
		} catch (e) {
			assert(e == "Callback not provided as 3rd argument")
			done()
		}
	})

	after(function() {
		r.table.restore()
	})
})
