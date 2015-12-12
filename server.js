var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// ./public contains static files
app.use(express.static('public'));

// respond with hello world when GET request is made
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/public/index.html');
});

// io connection response
io.on('connection', function(socket) {
	console.log('a user connected');
	io.emit('some event', {for : 'everyone'});
	socket.on('disconnect', function() {
		console.log('user disconnected');
	});
});

// Listen on port 3001
var server = http.listen(3001, function() {
	console.log('Listening on : http://localhost:' + server.address().port);
});