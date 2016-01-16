var r = require('rethinkdb');

if (process.env.NODE_ENV == "production") {
	opts = {
		host: process.env.RETHINKDB_HOST,
		port: process.env.RETHINKDB_PORT,
		authKey: process.env.RETHINKDB_AUTH_KEY,
		db: process.env.RETHINKDB_DB,
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
