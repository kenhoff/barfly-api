var jwtCheck = require('../../jwtCheck.js');
var onConnect = require('../../onConnect.js');
var getNextCounter = require('../../getNextCounter.js');
var r = require('rethinkdb');
var async = require('async');

module.exports = function(app) {

	require("./post.js")(app);

	app.get("/bars/:barID/orders/:orderID", jwtCheck, function(req, res) {
		try {
			// check to see if barID exists
			if (!("barID" in req.params)) {
				throw "barID required";
			}
			// check to see if orderID exists
			if (!("orderID" in req.params)) {
				throw "orderID required";
			}
			if (!(Number.isInteger(parseInt(req.params.barID)))) {
				throw "barID is not a number";
			}
			if (!(Number.isInteger(parseInt(req.params.orderID)))) {
				throw "orderID is not a number";
			}

			// check to see if barID is an int
			// check to see if orderID is an int
			onConnect.connect(function(err, connection) {
				r.table('product_orders').filter({
					parentOrderID: parseInt(req.params.orderID)
				}).without("parentOrderID").run(connection, function(err, cursor) {
					if (err) {
						throw err;
					}
					cursor.toArray(function(err, results) {
						// also, get information from the parent order
						r.table('orders').get(parseInt(req.params.orderID)).run(connection, function(err, order) {
							// needs to handle if there is no order
							res.json({
								sent: order.sent,
								productOrders: results,
								sentAt: order.sentAt
							});
							connection.close();
						});
					});
				});
			});
		} catch (e) {
			res.status(500).send(e);
		}
		// TODO: check and make sure the user in the jwt is a member of this bar
		// get all productOrders with a given parentOrderID, zip them up without IDs
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
	});


	app.patch("/bars/:barID/orders/:orderID", jwtCheck, function(req, res) {
			// TODO: check and make sure the user in the jwt is a member of this bar
		if ((req.body.orders == null) || (req.body.orders == [])) {
				// console.log("delete all products_orders!");
				// delete all product_orders for this order
			removeProductOrders(req.params.orderID, function() {
					// need to handle error
				res.sendStatus(200);
			});
		} else {
				// update all product_orders for this order
				// (need to populate parentOrderID for all the productOrders, blah)
			for (order of req.body.orders) {
				order["parentOrderID"] = req.params.orderID;
			}
				// async upsert and cull
			async.parallel(
					[function(cb) {
							// upsert
						async.each(req.body.orders, upsertProductOrder, function(err) {
								// need to handle error
							cb();
						});
					},
						function(cb) {
							// cull
							cullMissingOrders(req.params.orderID, req.body.orders, function() {
								cb();
							});
						}
					],
					function(err) {
						res.sendStatus(200);
					}
				);
		}
	}),


		cullMissingOrders = function(parentOrderID, orders, cb) {
			onConnect.connect(function(err, connection) {
				r.table('product_orders').filter({
					parentOrderID: parseInt(parentOrderID)
				}).run(connection, function(err, cursor) {
					cursor.toArray(function(err, results) {
						// yay binding!
						async.map(results, cullProductOrderIfNeeded.bind(this, orders), function(err) {
							cb();
							connection.close();
						});
					});
				});
			});
		};

	cullProductOrderIfNeeded = function(updatedProductOrders, dbProductOrder, cb) {
		for (updatedProductOrder of updatedProductOrders) {
			if ((parseInt(updatedProductOrder["productID"]) == dbProductOrder["productID"]) && (parseInt(updatedProductOrder["productSizeID"]) == dbProductOrder["productSizeID"])) {
				// then dbProductOrder is in updatedProductOrders - return cb()
				return cb();
			}
		}
		// however, if we get all the way through and can't find it, then we delete the dbProductOrder
		onConnect.connect(function(err, connection) {
			r.table('product_orders').get(dbProductOrder["id"]).delete().run(connection, function(err, result) {
				cb();
				connection.close();
			});
		});
	};

	upsertProductOrder = function(productOrder, cb) {
		getProductOrderID(productOrder.parentOrderID, productOrder.productID, productOrder.productSizeID, function(err, id) {
			// if id >= 0, update that ID
			if (id >= 0) {
				updateProductOrder(id, productOrder.productQuantity, function() {
					cb();
				});
			}
			// else, insert new sequential productOrder
			else {
				insertProductOrder(productOrder.parentOrderID, productOrder.productID, productOrder.productSizeID, productOrder.productQuantity, function() {
					cb();
				});
			}
		});

	};

	updateProductOrder = function(productOrderID, productQuantity, cb) {
		onConnect.connect(function(err, connection) {
			r.table('product_orders').get(parseInt(productOrderID)).update({
				productQuantity: parseInt(productQuantity)
			}).run(connection, function(err, result) {
				cb();
				connection.close();
			});
		});
	};

	insertProductOrder = function(parentOrderID, productID, productSizeID, productQuantity, cb) {
		// insert sequentially
		onConnect.connect(function(err, connection) {
			getNextCounter("product_orders", connection, function(err, newCounter) {
				r.table('product_orders').insert({
					id: newCounter,
					parentOrderID: parseInt(parentOrderID),
					productID: parseInt(productID),
					productSizeID: parseInt(productSizeID),
					productQuantity: parseInt(productQuantity)
				}).run(connection, function(err, result) {
					cb();
					connection.close();
				});
			});
		});
	};

	getProductOrderID = function(parentOrderID, productID, productSizeID, cb) {
		onConnect.connect(function(err, connection) {
			r.table('product_orders').filter({
				parentOrderID: parseInt(parentOrderID),
				productID: parseInt(productID),
				productSizeID: parseInt(productSizeID)
			}).run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					if (results.length == 1) {
						cb(null, results[0]["id"]);
					} else if (results.length == 0) {
						cb(null, -1);
					} else {
						cb("err");
					}
					connection.close();
				});
			});
		});
	};

	removeProductOrders = function(parentOrderID, cb) {
		// find all product_orders with the parentOrderID and remove them.
		onConnect.connect(function(err, connection) {
			r.table('product_orders').filter({
				parentOrderID: parseInt(parentOrderID)
			}).delete().run(connection, function(err, result) {
				cb();
				connection.close();
			});
		});
	};
};
