var jwtCheck = require('../jwtCheck.js');
var onConnect = require('../onConnect.js');
var getNextSequence = require('../getNextSequence.js');
var r = require('rethinkdb');
var async = require('async');

module.exports = function(app) {

	app.get("/bars/:barID/orders/:orderID", jwtCheck, function(req, res) {
		// TODO: check and make sure the user in the jwt is a member of this bar
		// get all productOrders with a given parentOrderID, zip them up without IDs
		onConnect(function(connection) {
				r.table('product_orders').filter({
					parentOrderID: parseInt(req.params.orderID)
				}).without("id", "parentOrderID").run(connection, function(err, cursor) {
					cursor.toArray(function(err, results) {
						res.json({
							orders: results
						})
					})
				})
			})
			// res.json({})
			/*
			should send something like
			{
				orders: [{
					productID: '27',
					productSize: '8',
					productQuantity: '8'
				}, {
					productID: '27',
					productSize: '9',
					productQuantity: '6'
				}, {
					productID: '27',
					productSize: '4',
					productQuantity: '9'
				}, {
					productID: '30',
					productSize: '10',
					productQuantity: '0'
				}]
			}
			*/
	})


	app.patch("/bars/:barID/orders/:orderID", jwtCheck, function(req, res) {
		// TODO: check and make sure the user in the jwt is a member of this bar
		if ((req.body.orders == null) || (req.body.orders == [])) {
			// console.log("delete all products_orders!");
			// delete all product_orders for this order
			removeProductOrders(req.params.orderID, function() {
				// need to handle error
				res.sendStatus(200)
			})
		} else {
			// update all product_orders for this order
			// (need to populate parentOrderID for all the productOrders, blah)
			for (order of req.body.orders) {
				order["parentOrderID"] = req.params.orderID
			}
			// async upsert and cull
			async.parallel(
				[function(cb) {
						// upsert
						async.each(req.body.orders, upsertProductOrder, function(err) {
							// need to handle error
							cb()
						})
					},
					function(cb) {
						// cull
						cullMissingOrders(req.params.orderID, req.body.orders, function() {
							cb()
						})
					}
				],
				function(err) {
					res.sendStatus(200)
				}
			)
		}
	})

	cullMissingOrders = function(parentOrderID, orders, cb) {
		onConnect(function(connection) {
			r.table('product_orders').filter({
				parentOrderID: parseInt(parentOrderID)
			}).run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					// yay binding!
					async.map(results, cullProductOrderIfNeeded.bind(this, orders), function(err) {
						cb()
					})
				})
			})
		})
	}

	cullProductOrderIfNeeded = function(updatedProductOrders, dbProductOrder, cb) {
		// console.log("updatedProductOrders:", updatedProductOrders);
		// console.log("dbProductOrder:", dbProductOrder);
		for (updatedProductOrder of updatedProductOrders) {
			if ((parseInt(updatedProductOrder["productID"]) == dbProductOrder["productID"]) && (parseInt(updatedProductOrder["productSizeID"]) == dbProductOrder["productSizeID"])) {
				// then dbProductOrder is in updatedProductOrders - return cb()
				return cb()
			}
		}
		// however, if we get all the way through and can't find it, then we delete the dbProductOrder
		onConnect(function(connection) {
			r.table('product_orders').get(dbProductOrder["id"]).delete().run(connection, function(err, result) {
				// console.log("deleted", dbProductOrder["id"]);
				cb()
			})
		})
	}

	upsertProductOrder = function(productOrder, cb) {
		getProductOrderID(productOrder.parentOrderID, productOrder.productID, productOrder.productSizeID, function(err, id) {
			// console.log("product order id:", id);
			// if id >= 0, update that ID
			if (id >= 0) {
				updateProductOrder(id, productOrder.productQuantity, function() {
					cb()
				})
			}
			// else, insert new sequential productOrder
			else {
				insertProductOrder(productOrder.parentOrderID, productOrder.productID, productOrder.productSizeID, productOrder.productQuantity, function() {
					cb()
				})
			}
		})

	}

	updateProductOrder = function(productOrderID, productQuantity, cb) {
		onConnect(function(connection) {
			r.table('product_orders').get(parseInt(productOrderID)).update({
				productQuantity: parseInt(productQuantity)
			}).run(connection, function(err, result) {
				cb()
					// console.log(result);
			})
		})
	}

	insertProductOrder = function(parentOrderID, productID, productSizeID, productQuantity, cb) {
		// console.log("inserting new product order");
		// insert sequentially
		onConnect(function(connection) {
			getNextSequence("product_orders", connection, function(newSeq) {
				r.table('product_orders').insert({
					id: newSeq,
					parentOrderID: parseInt(parentOrderID),
					productID: parseInt(productID),
					productSizeID: parseInt(productSizeID),
					productQuantity: parseInt(productQuantity)
				}).run(connection, function(err, result) {
					cb()
						// console.log(result);
				})
			})
		})
	}

	getProductOrderID = function(parentOrderID, productID, productSizeID, cb) {
		onConnect(function(connection) {
			r.table('product_orders').filter({
				parentOrderID: parseInt(parentOrderID),
				productID: parseInt(productID),
				productSizeID: parseInt(productSizeID)
			}).run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					// console.log("results:", results);
					if (results.length == 1) {
						// console.log("returning", results[0]["id"]);
						cb(null, results[0]["id"])
					} else if (results.length == 0) {
						// console.log("returning", -1);
						cb(null, -1)
					} else {
						cb("err")
					}
				})
			})
		})
	}

	removeProductOrders = function(parentOrderID, cb) {
		// find all product_orders with the parentOrderID and remove them.
		onConnect(function(connection) {
			r.table('product_orders').filter({
				parentOrderID: parseInt(parentOrderID)
			}).delete().run(connection, function(err, result) {
				console.log(result);
				cb()
			})
		})
	}
}
