var express = require('express');
var app = express();

// respond with hello world when GET request is made
app.get('/', function(req, res) {
	res.send('Hello World');
});

// Listen on port 3001
var server = app.listen(3001, function() {
	console.log('Listening on : ' + server.address().port);
})