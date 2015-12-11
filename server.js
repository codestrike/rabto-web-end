var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// respond with hello world when GET request is made
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

// io connection response
io.on('connection', function(socket) {
	console.log('a user connected');
});

// Listen on port 3001
var server = http.listen(3001, function() {
	console.log('Listening on : http://localhost:' + server.address().port);
});