var r = require('rethinkdb');

console.log(process.env.RETHINKDB_CACERT);

module.exports = function(cb) {
	r.connect({
		host: "aws-us-east-1-portal.9.dblayer.com",
		port: 10384,
		authKey: "auwvteoiuclrdkxjEofivucXKYESOalvkjcetdlfxkm",
		db: "barfly_production",
		ssl: {
			ca: new Buffer(process.env.RETHINKDB_CACERT)
		}
	}, function(err, conn) {
		if (!err) {
			cb(conn)
		} else {
			throw "Database connection error"
		}
	})
}
