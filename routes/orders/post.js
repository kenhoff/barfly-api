var jwtCheck = require('../../jwtCheck.js');
var onConnect = require('../../onConnect.js');
var getNextSequence = require('../../getNextSequence.js');
var r = require('rethinkdb');
var async = require('async');
var request = require('request');

if (process.env.NODE_ENV == "production") {
	test_sid = "AC7ce3753b21563d6ec2b75d6a06a819ac"
	test_auth_token = "91fe1a0990c6441fcffd14c47304cfb6"
	barflyPhoneNumber = "+17208970517"

} else {
	test_sid = "AC05402430fb627014f1af0e943ae5bcb3"
	test_auth_token = "a06173ffc9c1c260f95a424e5d73c889"
	barflyPhoneNumber = "+15005550006"
}



//require the Twilio module and create a REST client
var twilioClient = require('twilio')(test_sid, test_auth_token)

module.exports = function(app) {
	app.post("/bars/:barID/orders/:orderID", jwtCheck, function(req, res) {
		onConnect(function(connection) {
			// look up all product_orders
			r.table("product_orders").filter({
				parentOrderID: parseInt(req.params.orderID)
			}).run(connection, function(err, cursor) {
				cursor.toArray(function(err, productOrders) {
					sendProductOrders(productOrders, parseInt(req.params.barID), function(err) {
						if (err) {
							res.status(500).send(err)
						} else {
							res.sendStatus(200)
						}
					})
				})
			})
		})
	})

	// for each product_order
	// check to see if product exists in global DB, if not, skip it
	// if product_order quantity is 0, skip it
	// resolve rep for product in zip code and bar
	// if no rep, throw res 500
	// else, add to rep_orders
	// after going through all product_orders and populating rep_orders
	// go through all rep_orders and send order to each rep with twilio
	// after all that's done, res 200. Mark order as sent.
}

sendProductOrders = function(productOrders, barID, cb) {
	err = null
	cullInvalidProductOrders(productOrders, function(productOrders) {
		repOrders = []
		async.each(productOrders, addProductOrderToRepOrders.bind(this, barID, repOrders), function(err) {
			if (err) {
				cb(err)
			} else {
				// now, for each rep order, send the order!
				async.each(repOrders, sendRepOrder.bind(this, barID), function(err) {
					cb()
				})

			}
		})
	})
}

sendRepOrder = function(barID, repOrder, cb) {
	// console.log(repOrder);
	// okay, here's what we'd like to send to the reps:
	// Hi <<rep name>>, here's the latest order for <<bar name>>.
	// 1 Patron 750ml
	// 2 Jack Daniels 1.5l
	// Please respond to your account at <<bar name>> to let them know that you've received the order.
	// Thanks!

	// first, get the bar name
	onConnect(function(connection) {
		r.table('bars').get(barID).run(connection, function(err, bar) {

			request.get({
				url: "https://barfly.auth0.com/api/v2/users/" + repOrder.repID,
				headers: {
					"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJwS1J5S2J3dzVPRzRVVUIzdG5LYWJHZ1hqSTJDMnVNQiIsInNjb3BlcyI6eyJ1c2VycyI6eyJhY3Rpb25zIjpbInJlYWQiXX19LCJpYXQiOjE0NTIyNzM1NjQsImp0aSI6IjA5Nzg5ZTI0NDBiNDI2OGEwZGVlM2M5NTk2NzlmYWUyIn0.hvNLp9bXGC0Mie_hjW505GKS7kvD5r6SdYY5QshbgL0"
				},
				form: {}
			}, function(err, response, body) {
				if (err) {
					cb(err)
				} else if (response.statusCode < 300) {
					// contains rep name and number
					createOrderStrings(repOrder.productOrders, function(err, orderStrings) {
						smsString = assembleString(JSON.parse(body).name, bar.barName, orderStrings)
						twilioClient.sendMessage({
							from: barflyPhoneNumber,
							to: JSON.parse(body).user_metadata.phone,
							body: smsString
						}, function(err, responseData) {
							cb(err)
						})
					})
				} else {
					cb(err)
				}
			})
		})
	})


	// then, get the rep name and number
	// then, for each productOrder, get the productName and productSizeName, package that up into an array of orderStrings
}


assembleString = function(repName, barName, orderStrings) {
	order = orderStrings.join("\n")
	return "Hi there " + repName + "! Here's the latest order for " + barName + ".\n\n" + order + "\n\nPlease respond to your contact at " + barName + " to let them know that you've received the order.\n\nThanks!"
}

createOrderStrings = function(productOrders, cb) {
	async.map(productOrders, attachProductNameAndSize, function(err, productOrders) {
		cb(err, productOrders.map(function(productOrder) {
			return productOrder.productQuantity + " " + productOrder.productName + " " + productOrder.productSizeName
		}))
	})
}

attachProductNameAndSize = function(productOrder, cb) {
	getProductName(productOrder.productID, function(err, productName) {
		getProductSizeName(productOrder.productSizeID, function(err, productSizeName) {
			productOrder.productName = productName
			productOrder.productSizeName = productSizeName
			cb(err, productOrder)
		})
	})
}


getProductName = function(productID, cb) {

	onConnect(function(connection) {
		r.table("products").get(productID).run(connection, function(err, result) {
			cb(err, result.productName)
		})
	})
}

getProductSizeName = function(productSizeID, cb) {
	onConnect(function(connection) {
		r.table("sizes").get(productSizeID).run(connection, function(err, result) {
			cb(err, result.sizeName)
		})
	})
}

addProductOrderToRepOrders = function(barID, repOrders, productOrder, cb) {
	// first, resolve the productOrder, so we know which repOrder to add the productOrder to.
	onConnect(function(connection) {
		// first, what zip code is the bar in?
		r.table("bars").get(barID).run(connection, function(err, bar) {
			// next, look up the distributor that carries the product in this zip code.
			r.table("zipcode_product_distributor").filter({
				zipcode: bar.zipCode,
				productID: productOrder.productID
			}).run(connection, function(err, cursor) {
				cursor.toArray(function(err, zipCodeProductDistributor) {
					if (err) {
						cb(err)
					} else if (zipCodeProductDistributor.length > 1) {
						cb("found more than one distributor that carries " + productOrder.productID + " in " + bar.zipCode)
					} else if (zipCodeProductDistributor.length == 0) {
						cb("didn't find any distributor that carries " + productOrder.productID + " in " + bar.zipCode)
					} else {
						// look up the account that this distributor has with this bar in order to get the rep
						r.table("accounts").filter({
							distributorID: zipCodeProductDistributor[0].distributorID,
							barID: barID
						}).run(connection, function(err, cursor) {
							cursor.toArray(function(err, accounts) {
								if (err) {
									cb(err)
								} else if (accounts.length > 1) {
									cb("found more than one account for bar " + barID + " and distributor " + zipCodeProductDistributor[0].distributorID)
								} else if (accounts.length == 0) {
									cb("didn't find any account with a rep for bar " + barID + " and distributor " + zipCodeProductDistributor[0].distributorID)
								} else {
									// now add the product to the appropriate rep order.
									for (repOrder of repOrders) {
										if (repOrder.repID == accounts[0].repID) {
											repOrder.productOrders.push(productOrder)
											return cb()
										}
									}
									// if we didnt' find a rep with the order, push a new repOrder onto repOrders
									repOrders.push({
										repID: accounts[0].repID,
										productOrders: [productOrder]
									})
									cb()
								}
							})
						})
					}
				})
			})
		})
	})
}

cullInvalidProductOrders = function(productOrders, cb) {
	async.filter(productOrders, removeNonexistentProducts, function(productOrders) {
		async.filter(productOrders, removeZeroOrNullOrders, function(productOrders) {
			cb(productOrders)
		})
	})
}

removeNonexistentProducts = function(productOrder, cb) {
	onConnect(function(connection) {
		r.table("products").get(productOrder.productID).run(connection, function(err, result) {
			if (result) {
				cb(true)
			} else {
				cb(false)
			}
		})
	})
}

removeZeroOrNullOrders = function(productOrder, cb) {
	if ((typeof productOrder.productQuantity == "number") && (productOrder.productQuantity > 0)) {
		cb(true)
	} else {
		cb(false)
	}
}
