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
			getNextSequence("products", connection, function(newSeq) {
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
		})
	})
}
