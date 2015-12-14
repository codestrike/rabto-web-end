var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var credentials = require("./credentials.js");
var pg = require('pg');

// ./public contains static files
app.use(express.static('public'));

// respond with hello world when GET request is made
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/public/index.html');
});

app.get('/get_all', function(req, res) {
	pg.connect(
		"postgres://" + credentials.pg.user + ":" + credentials.pg.password + "@" + credentials.pg.host + "/" + credentials.pg.database, 
		function(err, client, done) {
			if (err) {
				console.log(err);
				res.json({status:false});
			} else {
				var query = client.query('Select * From marker', '', function(err, result) {
					done();
					if (err) {
						console.log(err);
					} else {
						console.log(result);
						res.json({status:true, result:result});
					}
				})
			}
		})

	// res.json(result)
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