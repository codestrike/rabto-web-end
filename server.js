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

// Set port number from config
app.set('port', (process.env.PORT || 5000));

// ./public contains static files
app.use(express.static('public'));

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

// Deprecated! Use io event `old markers` instead.
app.get('/get_all_markers', function(req, res) {
	var result = {};
	query('Select * From marker', '', function(err, markers, done) {
		done();
		if (err) {
			console.log(err);
		} else {
			res.json(markers.rows);
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

	// Marker 
	socket.on('new marker', function(marker) {
		query(
			'Insert Into marker (lat, lng) Values ($1, $2)', 
			[marker.lat, marker.lng],
			function(err, result, done) {
				done();
				(!err)? io.emit('new marker', marker) : console.log(err);
			});
		console.log('[on(new merker)]', marker);
	});

	socket.on('old markers', function(view) {
		query('Select * From marker', '', function(err, markers, done) {
			done();
			(!err)? socket.emit('old markers', markers.rows) : console.log(err);
			console.log('[on(old markers)]', markers.rows);
		});
	});

	socket.on('old popup', function(marker) {
		// send popup for this marker
		query(
			'Select * From popup Where id = $1',
			[marker.id],
			function (err, popup, done) {
				done();
				(!err)? socket.emit('old popup', popup.rows) : console.log(err);
			});
	});
});

// Listen
var server = http.listen(app.get('port'), function() {
	console.log('Listening on : http://localhost:' + server.address().port);
});