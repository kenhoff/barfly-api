var r = require('rethinkdb');

if (process.env.NODE_ENV == "production") {
	opts = {
		host: "aws-us-east-1-portal.9.dblayer.com",
		port: 10384,
		authKey: "auwvteoiuclrdkxjEofivucXKYESOalvkjcetdlfxkm",
		db: "barfly_production",
		ssl: {
			ca: new Buffer(process.env.RETHINKDB_CACERT)
		}
	}
} else {
	opts = {}
}

module.exports.connect = function(cb) {
	r.connect(opts, function(err, conn) {
			cb(err, conn)
	})
}
