var jwtCheck = require('../../jwtCheck.js');
var onConnect = require('../../onConnect.js');
var getNextCounter = require('../../getNextCounter.js');
var r = require('rethinkdb');
var async = require('async');
var request = require('request');

//require the Twilio module and create a REST client
var twilioClient = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN)

module.exports = function(app) {
	app.post("/bars/:barID/orders/:orderID", jwtCheck, function(req, res) {
		onConnect.connect(function(err, connection) {
			// look up all product_orders
			r.table("product_orders").filter({
				parentOrderID: parseInt(req.params.orderID)
			}).run(connection, function(err, cursor) {
				cursor.toArray(function(err, productOrders) {
					// look up user info, include it with productOrders
					request.get({
						url: "https://" + process.env.AUTH0_DOMAIN + "/api/v2/users/" + req.user.sub,
						headers: {
							"Authorization": "Bearer " + process.env.AUTH0_API_JWT
						}
					}, function(err, response, user) {
						sendProductOrders(productOrders, parseInt(req.params.barID), JSON.parse(user), function(err) {
							if (err) {
								res.status(500).send(err)
							} else {
								// write the order as sent
								r.table("orders").get(parseInt(req.params.orderID)).update({
									sent: true,
									sentAt: new Date()
								}).run(connection, function(err, result) {
									if (!err) {
										res.sendStatus(200)
									} else {
										res.status(500).send(err)
									}
									connection.close()
								})
							}
						})
					})

				})
			})
		})
	})
}

sendProductOrders = function(productOrders, barID, user, cb) {
	err = null
	cullInvalidProductOrders(productOrders, function(productOrders) {
		repOrders = []
		async.each(productOrders, addProductOrderToRepOrders.bind(this, barID, repOrders), function(err) {
			if (err) {
				cb(err)
			} else {
				// now, for each rep order, send the order!
				async.each(repOrders, sendRepOrder.bind(this, barID, user), function(err) {
					cb()
				})

			}
		})
	})
}


sendRepOrder = function(barID, user, repOrder, cb) {
	// console.log(repOrder);
	// okay, here's what we'd like to send to the reps:
	// Hi <<rep name>>, here's the latest order for <<bar name>>.
	// 1 Patron 750ml
	// 2 Jack Daniels 1.5l
	// Please respond to your account at <<bar name>> to let them know that you've received the order.
	// Thanks!

	// first, get the bar name
	onConnect.connect(function(err, connection) {
		r.table('bars').get(barID).run(connection, function(err, bar) {

			request.get({
				url: "https://" + process.env.AUTH0_DOMAIN + "/api/v2/users/" + repOrder.repID,
				headers: {
					"Authorization": "Bearer " + process.env.AUTH0_API_JWT
				}
			}, function(err, response, body) {
				if (err) {
					cb(err)
				} else if (response.statusCode < 300) {
					// contains rep name and number
					createOrderStrings(repOrder.productOrders, function(err, orderStrings) {
						smsString = assembleString(JSON.parse(body).user_metadata.name, bar.barName, orderStrings, user)
						twilioClient.sendMessage({
							from: process.env.TWILIO_NUMBER,
							to: JSON.parse(body).user_metadata.phone,
							body: smsString
						}, function(err, responseData) {
							console.log(responseData.body);


							// if process.env.NODE_ENV == "production", send order into slack here
							if (process.env.NODE_ENV == "production") {
								request.post({
									url: process.env.SLACK_WEBHOOK_URL,
									form: {
										"payload": JSON.stringify({
											"text": "```" + responseData.body + "```"
										})
									}
								})
							}


							cb(err)
							connection.close()
						})
					})
				} else {
					cb(err)
					connection.close()
				}
			})
		})
	})

	// then, get the rep name and number
	// then, for each productOrder, get the productName and productSizeName, package that up into an array of orderStrings
}


assembleString = function(repName, barName, orderStrings, user) {
	order = orderStrings.join("\n")
	smsString = "Hi there " + repName + "! Here's the latest order for " + barName + ".\n\n" + order + "\n\n"
	if (("user_metadata" in user) && ("phone" in user.user_metadata)) {
		smsString += "Please respond to " + user.given_name + " (" + user.user_metadata.phone + ") to let them know that you've received the order.\n\nThanks!"
	} else {
		smsString += "Please respond to " + user.given_name + " to let them know that you've received the order.\n\nThanks!"
	}
	return smsString
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

	onConnect.connect(function(err, connection) {
		r.table("products").get(productID).run(connection, function(err, result) {
			cb(err, result.productName)
			connection.close()
		})
	})
}

getProductSizeName = function(productSizeID, cb) {
	onConnect.connect(function(err, connection) {
		r.table("sizes").get(productSizeID).run(connection, function(err, size) {
			// here, we just return a list of size names - instead, we need to return a list of combination containerName and packagingNames
			r.table("containers").get(parseInt(size.containerID)).run(connection, function(err, container) {
				r.table("packaging").get(parseInt(size.packagingID)).run(connection, function(err, packaging) {
					cb(err, container.containerName + ", " + packaging.packagingName)
					connection.close()
				})
			})
		})
	})
}

addProductOrderToRepOrders = function(barID, repOrders, productOrder, cb) {
	// first, resolve the productOrder, so we know which repOrder to add the productOrder to.
	onConnect.connect(function(err, connection) {
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
											connection.close()
										}
									}
									// if we didnt' find a rep with the order, push a new repOrder onto repOrders
									repOrders.push({
										repID: accounts[0].repID,
										productOrders: [productOrder]
									})
									cb()
									connection.close()
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
	onConnect.connect(function(err, connection) {
		r.table("products").get(productOrder.productID).run(connection, function(err, result) {
			if (result) {
				cb(true)
			} else {
				cb(false)
			}
			connection.close()
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
