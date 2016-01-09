var jwtCheck = require('../jwtCheck.js');
// hacky and gross. any way around this?

var onConnect = require('../onConnect.js');
var getNextSequence = require('../getNextSequence.js');

var r = require('rethinkdb');


module.exports = function(app) {
	app.get("/products", function(req, res) {
		onConnect(function(connection) {
			r.table("products").withFields('id').run(connection, function(err, cursor) {
				cursor.toArray(function(err, products) {
					response = []
					for (var i = 0; i < products.length; i++) {
						response.push(products[i]["id"])
					}
					res.json(response)
				})
			})
		})
	})

	app.get("/products/:productID", function(req, res) {
		onConnect(function(connection) {
			r.table("products").get(parseInt(req.params.productID)).run(connection, function(err, product) {
				res.json(product)
			})
		})
	})

	app.post("/products", jwtCheck, function(req, res) {
		onConnect(function(connection) {
			// check if the name inserted is exactly the same as the name of a product in the DB.
			r.table('products').filter({
				productName: req.body.productName
			}).run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					if (results.length > 1) {
						// throw err
					} else if (results.length == 1) {
						// just update this product
						// If so, just update that product and append the new size.
						results[0].productSizes.push(parseInt(req.body.productSize))
						console.log(results[0]);
						r.table('products').get(results[0].id).update({
							productSizes: results[0].productSizes
						}).run(connection, function(err, result) {
							if (!err) {
								res.json({
									productID: results[0].id
								})
							}
						})
					} else {
						// create the new product
						// else, create a new product with that size.
						// alert alert! need to send emails to Ken & Peter when this happens.
						getNextSequence("products", connection, function(err, newSeq) {
							r.table('products').insert({
								id: newSeq,
								productName: req.body.productName,
								productSizes: [parseInt(req.body.productSize)]
							}).run(connection, function(err, result) {
								if (!err) {
									res.json({
										productID: newSeq
									})
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
		onConnect(function(connection) {
			r.table("zipcode_product_distributor").filter({
				zipcode: parseInt(req.params.zipcode),
				productID: parseInt(req.params.productID)
			}).pluck("distributorID").run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					if (results.length > 1) {
						// throw error
					} else if (results.length == 0) {
						res.json({})
					} else {
						res.json(results[0])
					}
				})
			})
		})
	})




	app.post("/products/:productID/zipcodes/:zipcode/distributor", function(req, res) {
		// look up in zipcode_product_distributor table
		onConnect(function(connection) {
			r.table("zipcode_product_distributor").filter({
				zipcode: req.params.zipcode,
				productID: req.params.productID
			}).run(connection, function(err, cursor) {
				cursor.toArray(function(err, results) {
					if (results.length >= 1) {
						// throw error
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
							}
						})
					}
				})
			})
		})
	})




}
