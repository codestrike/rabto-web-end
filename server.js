var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var pg = require('pg');

// Try for dev (local) else try for prod (heroku)
var credentials = null;
try {
	var c = require("./credentials.js");
	credentials = "postgres://" + c.pg.user + ":" + c.pg.password + "@" + c.pg.host + "/" + c.pg.database;
} catch(e) {
	console.log('[Looks like it is heroku]');
	credentials = process.env.DATABASE_URL;
}

// ./public contains static files
app.use(express.static('public'));

// respond with hello world when GET request is made
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/public/index.html');
});

var query = function(sql, param, callback) {
	pg.connect(
		credentials, 
		function(err, client, done) {
			if (err) {
				console.log(err);
				callback(err);
			} else {
				client.query(sql, param, function(err, result) {
					callback(err, result, done);
				});
			}
		});
};

app.get('/get_all', function(req, res) {
	query('Select * From marker', '', function(err, result, done) {
		done();
		if (err) {
			console.log(err);
		} else {
			res.json(result);
		}
	});
});

// io connection response
io.on('connection', function(socket) {
	console.log('a user connected');
	io.emit('some event', {for : 'everyone'});
	socket.on('disconnect', function() {
		console.log('user disconnected');
	});

	// Marker Added
	socket.on('new marker', function(m) {
		query(
			'Insert Into marker(lat, lng) Values ($1, $2)', 
			[m.lat, m.lng],
			function(err, result, done) {
				done();
				(!err)? io.emit('new marker', m) : console.log(err);
			});
	});
});

// Listen on port 3001
var server = http.listen(3001, function() {
	console.log('Listening on : http://localhost:' + server.address().port);
});