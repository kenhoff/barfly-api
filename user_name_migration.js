const request = require('request');
console.log("Starting...");

var token = "insert-token-here";

var url = "https://barfly-dev.auth0.com" // modify this for dev or prod

// get all users


request.get({
	url: url + "/api/v2/users",
	headers: {
		Authorization: "Bearer " + token
	},
	qs: {
		per_page: 100
	}
}, function(err, response, body) {
	var users = JSON.parse(body)
	for (var user of users) {
		var user_id = user.user_id;
		var user_name = user.name;
		// console.log(user.user_metadata.name);
		// write user's name to user_metadata.name
		request({
			url: url + "/api/v2/users/" + user_id,
			method: "PATCH",
			body: {
				user_metadata: {
					name: user_name
				}
			},
			headers: {
				Authorization: "Bearer " + token
			},
			json: true
		}, function(err, response, body) {
			if (err) {
				console.log(err);
			}
		})
	}
})


console.log("Finished!");
