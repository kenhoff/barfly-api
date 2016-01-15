var jwt = require('express-jwt');

module.exports = jwt({
	secret: new Buffer(process.env.AUTH0_CLIENTSECRET, 'base64'),
	audience: process.env.CLIENTID
});
