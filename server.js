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
					done();
					callback(err, result);
				});
			}
		});
};

// Deprecated! Use io event `old markers` instead.
app.get('/get_all_markers', function(req, res) {
	var result = {};
	query('Select * From marker', '', function(err, markers) {
		(!err)? res.json(markers.rows) : console.log(err);;
	});
});

var storePopup = function(marker) {
	query(
		'Insert Into popup (post_text, marker) Values ($1, $2) returning id',
		[marker.post_text, marker.id],
		function(err, result) {
			if (err) {
				console.log(err);
			} else {
				io.emit('new popup', {
					id: result.rows[0].id,
					marker: marker.id
				});
			}
		});
	// console.log('[query()]', marker);
};

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
			'Insert Into marker (lat, lng) Values ($1, $2) returning id', 
			[marker.lat, marker.lng],
			function(err, result) {
				if (err) {
					console.log(err);
				} else {
					marker.id = result.rows[0].id;
					io.emit('new marker', marker);

					// Cool, we have marker id. Now store popup
					storePopup(marker);
				}
				// console.log('[on(new merker)]', marker);
			});
	});

	socket.on('old markers', function(view) {
		query('Select * From marker', '', function(err, markers) {
			(!err)? socket.emit('old markers', markers.rows) : console.log(err);
			// console.log('[on(old markers)]', markers.rows);
		});
	});

	// Popup
	socket.on('old popups', function(marker) {
		// send popup for this marker
		query(
			'Select * From popup Where marker = $1',
			[marker.id],
			function (err, popups) {
				(!err)? socket.emit('old popups', popups.rows) : console.log(err);
				console.log('[on(old popups)]', popups.rows);
			});
	});
});

// Listen
var server = http.listen(app.get('port'), function() {
	console.log('Listening on : http://localhost:' + server.address().port);
});
