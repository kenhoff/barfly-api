var jwt = require('express-jwt');

module.exports = jwt({
	secret: new Buffer('hkff8xzqlpnJMnywtfhM3YaNHLl-RGFlOYGrYqSKl41wxrXxVzcLEGyqt0ErqqPe', 'base64'),
	audience: 'JeIT5hdK0PXWuMVE1GSYbDT4Uw2HQpKx'
});
