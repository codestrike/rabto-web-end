var express = require('express');
var app = express();
var cloudy = require('cloudinary');
var fs = require('fs');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var pg = require('pg');
var session = require('express-session');

// Try for dev (local) else try for prod (heroku)
var credentials = null;
try {
	var c = require("./credentials.js");
	credentials = "postgres://" + c.pg.user + ":" + c.pg.password + "@" + c.pg.host + "/" + c.pg.database;

	//Cloudinary Confguration
	cloudy.config({
		cloud_name : c.cloudy.cloud_name,
		api_key : c.cloudy.api_key,
		api_secret : c.cloudy.api_secret
	});
} catch(e) {
	console.log('[Looks like it is heroku]');
	credentials = process.env.DATABASE_URL;

	cloudy.config({
		cloud_name: process.env.CLOUDY_NAME,
		api_key: process.env.CLOUDY_API_KEY,
		api_secret: process.env.CLOUDY_SECRET
	});
}

// Set port number from config
app.set('port', (process.env.PORT || 5000));

// session middleware
app.use(session({
  secret: 'pommingbooff',
  resave: true,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 360000 }
}));

// ./public contains static files
app.use(express.static('public'));

app.get('/', function(req, res) {
	var sess = req.session;
	console.log('apt.get /', sess.username);
	if (sess.username) {
		res.sendFile(__dirname + '/index.admin.html');
	} else {
		res.sendFile(__dirname + '/index.html');
	}
});

app.get('/login', function(req, res) {
	if (req.query['un']) {
		var sess = req.session;
		console.log('[New Login]', req.query['un']);
		sess.username = req.query['un'];
		sess.save();
	} else {
		console.log('[Invalid Login Attempt]');
	}
	res.redirect('/?un=pikachu');
});

// Test functions for session starts
app.get('/i', function(req, res) {
	console.log('[app.get() /i]', req.query['u']);
	if(req.query['u'] && req.query['u'] == req.query['p']) {
		var sess = req.session;
		sess.i = 'qBx3r843fjW' + req.query['u'];
		sess.basewa = 12;
		sess.save();
		console.log('in session', sess.i);
	}
	res.redirect('/');
});

app.get('/o', function(req, res) {
	req.session.destroy(function(err){
		if(err) console.log(err);
		res.redirect('/');
	});
});

app.get('/echo', function(req, res) {
	var sess = req.session;
	sess.basewa = sess.basewa + 1;
	console.log('Echoing sess', sess);
	res.end(req.sessionID + " AND " + sess.basewa);
});
// Test function for session ends

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
				uploadImage({
					id: result.rows[0].id,
					marker: marker.id,
					post_text: marker.post_text,
					base64_image: marker.post_image
				});
			}
		});
	// console.log('[query()]', marker);
};

//imgae upload function

var uploadImage = function(popup) {
	cloudy.uploader.upload(popup.base64_image, function(response) { 
		query(
			'Update popup Set post_image = $1 Where id = $2',
			[response.secure_url, popup.id],
			function(err, result) {
				if (err) {
					console.log();
				} else {
					delete popup.base64_image;
					popup.post_image = response.secure_url;
					io.emit('new popup', popup);
					console.log("[uploadImage()]", popup);
				}
			});
	});
}

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

	socket.on('delete marker', function(id) {
		query(
			'Delete From marker Where id = $1',
			[id],
			function(err, result) {
				if (err) {
					console.log(err);
				} else {
					io.emit('delete marker', id);
				}
			});
		// console.log('[on(delete marker)]', id);
	});

	// Popup
	socket.on('old popups', function(marker) {
		query(
			'Select * From popup Where marker = $1',
			[marker.id],
			function (err, popups) {
				(!err)? socket.emit('old popups', popups.rows) : console.log(err);
				// console.log('[on(old popups)]', popups.rows);
			});
	});

	socket.on('modified popup', function(popup) {
		query(
			'Update popup Set post_text = $1, hash_tags = $2 Where id = $3 returning marker',
			[popup.post_text, popup.hash_tags, popup.id],
			function (err, result) {
				if(!err) {
					popup.marker = result.rows[0].marker;
					io.emit('modified popup', popup);
				} else {
					console.log(err);
				}
			});
		// console.log('[on(modified popup)]', popup);
	});
});

// Listen
var server = http.listen(app.get('port'), function() {
	console.log('Listening on : http://localhost:' + server.address().port);
});
