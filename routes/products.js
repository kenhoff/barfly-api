var jwtCheck = require('../jwtCheck.js');
// hacky and gross. any way around this?

var onConnect = require('../onConnect.js');
var getNextCounter = require('../getNextCounter.js');

var r = require('rethinkdb');


module.exports = function(app) {
	app.get("/products", function(req, res) {
		onConnect.connect(function(err, connection) {
			r.table("products").withFields('id', 'productName').run(connection, function(err, cursor) {
				cursor.toArray(function(err, products) {
					response = []
					for (var i = 0; i < products.length; i++) {
						response.push({
							productID: products[i]["id"],
							productName: products[i]["productName"]
						})
					}
					res.json(response)
					connection.close()
				})
			})
		})
	})

	app.get("/products/:productID", function(req, res) {
		onConnect.connect(function(err, connection) {
			r.table("products").get(parseInt(req.params.productID)).run(connection, function(err, product) {
				res.json(product)
				connection.close()
			})
		})
	})

	app.post("/products", jwtCheck, function(req, res) {
		onConnect.connect(function(err, connection) {
			// check if the name inserted is exactly the same as the name of a product in the DB.
			r.table('products').filter({
				productName: req.body.productName
			}).run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					if (results.length > 1) {
						// throw err
					} else if (results.length == 1) {
						// If so, do nothing!
						res.json({
							productID: results[0].id
						})
						connection.close()
					} else {
						// else, create a new product with that size.
						// alert alert! need to send emails to Ken & Peter when this happens.
						getNextCounter("products", connection, function(err, newCounter) {
							r.table('products').insert({
								id: newCounter,
								productName: req.body.productName,
								productSizes: []
							}).run(connection, function(err, result) {
								if (!err) {
									res.json({
										productID: newCounter
									})
									connection.close()
								}
							})
						})
					}
				})
			})
		})
	})

	app.get("/products/:productID/zipcodes/:zipcode/distributor", function(req, res) {
		// look up in zipcode_product_distributor table
		onConnect.connect(function(err, connection) {
			r.table("zipcode_product_distributor").filter({
				zipcode: parseInt(req.params.zipcode),
				productID: parseInt(req.params.productID)
			}).pluck("distributorID").run(connection, function(err, cursor) {
				if (err) {
					res.status(500).send(err)
				} else {
					cursor.toArray(function(err, results) {
						if (results.length > 1) {
							// throw error
						} else if (results.length == 0) {
							res.json({})
						} else {
							res.json(results[0])
						}
						connection.close()
					})
				}
			})
		})
	})

	app.post("/products/:productID/zipcodes/:zipcode/distributor", function(req, res) {
		// look up in zipcode_product_distributor table
		onConnect.connect(function(err, connection) {
			r.table("zipcode_product_distributor").filter({
				zipcode: req.params.zipcode,
				productID: req.params.productID
			}).run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					if (results.length >= 1) {
						// throw error
						connection.close()
						res.sendStatus(500)
					} else {
						// save the zipcode_product_distributor entry
						r.table("zipcode_product_distributor").insert({
							zipcode: parseInt(req.params.zipcode),
							productID: parseInt(req.params.productID),
							distributorID: parseInt(req.body.distributorID)
						}).run(connection, function(err, result) {
							if (!err) {
								res.sendStatus(200)
								connection.close()
							}
						})
					}
				})
			})
		})
	})

	app.post("/products/:productID/sizes", jwtCheck, function(req, res) {
		onConnect.connect(function(err, connection) {
			r.table("products").get(parseInt(req.params.productID)).update({
				productSizes: r.row("productSizes").append(parseInt(req.body.sizeID))
			}).run(connection, function(err, result) {
				if (err) {
					res.status(500).send(err)
				} else {
					res.sendStatus(200)
				}
				connection.close()
			})
		})
	})
}
