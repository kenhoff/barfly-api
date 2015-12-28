var fs = require('fs');
var r = require('rethinkdb');

module.exports = function(cb) {
	// console.log("opening new connection");
	fs.readFile("./cacert", function(err, caCert) {
		r.connect({
			host: "aws-us-east-1-portal.9.dblayer.com",
			port: 10384,
			authKey: "auwvteoiuclrdkxjEofivucXKYESOalvkjcetdlfxkm",
			db: "barfly_production",
			ssl: {
				ca: caCert
			}
		}, function(err, conn) {
			if (!err) {
				cb(conn)
			} else {
				throw "Database connection error"
			}
		})
	})
}
