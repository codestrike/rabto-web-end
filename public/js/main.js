 // Globals and init setup
var Rabta = {
	map: L.map('map').setView([19, 72.8], 13),
	editBox: document.getElementsByClassName('edit-box')[0],
	socket: io(),
	things: {},
	getUniqueID: function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		    var r = crypto.getRandomValues(new Uint8Array(1))[0]%16|0, v = c == 'x' ? r : (r&0x3|0x8);
		    return v.toString(16);
		});
	},

	// Marker
	createMarker: function(lat, lng) {
		var m = L.marker([lat, lng]);
		m._id = Rabta.getUniqueID();
		Rabta.things[m._id] = m;
		m.bindPopup(Rabta.getPopupFor(m._id))
		m.addTo(Rabta.map);
		// console.log('[createMarker()]', lat, lng, m._id, m);
	},

	// Popup
	getPopupFor: function(id) {
		// TODO use data coming from cloud
		return (new DOMParser)
			.parseFromString(`<div class="card popup-card">
					<section class="head">
						<strong class="author">${id}</strong>
						<p class="text">lorem impsum beat bee do</p>
					</section>
					<div style="background-image:url('/img/b.jpg')" class="hero"></div>
					<div class="foot">
						<button class="btn btn-edit" data-id="popup-${id}">Edit</button>
					</div>
				</div>`, 'text/html')
			.lastChild.innerHTML;
	},

	// Edit Box
	showEditBox: function(lat, lng) {
		try {
			var popup = document.getElementsByClassName('popup-card')[0];
			// console.log('Yay! p', popup);
			Rabta.editBox.getElementsByClassName('edit-box-text')[0].value = popup.getElementsByClassName('text')[0].innerHTML;
		} catch (e) {
			// There is no .popup-card => this is new card
			// console.log('[Will create a new card on .btn-done]');
			Rabta.editBox.setAttribute('data-lat', lat);
			Rabta.editBox.setAttribute('data-lng', lng);
		}
		Rabta.editBox.classList.add('overlay');
	},
	
	// Map
	makeMap: function() {
		L.tileLayer('http://{s}.jtile.osm.org/{z}/{x}/{y}.png', {maxZoom: 18}).addTo(Rabta.map);
		Rabta.map
		.on('contextmenu', function(e) {
			// TODO edit box first then on done, emit
			Rabta.showEditBox(e.latlng.lat, e.latlng.lng);
			// Rabta.socket.emit('new marker', {lat:e.latlng.lat, lng:e.latlng.lng});
		})
		.on('popupopen', function(e) {
			var p = document.getElementsByClassName('btn-edit')[0];
			p.addEventListener('click', function(e) {
				Rabta.showEditBox(p, e);
			});
		});
	},

	initEditBox: function() {
		var d = Rabta.editBox.getElementsByClassName('btn-edit-done')[0];
		var c = Rabta.editBox.getElementsByClassName('btn-edit-cancel')[0];
		d.addEventListener('click', function(e) {
			try {
				var popup = document.getElementsByClassName('popup-card')[0];
				popup.getElementsByClassName('text')[0].innerHTML = Rabta.editBox.getElementsByClassName('edit-box-text')[0].value;
				// console.log('[.btn-done click]', popup);
			} catch (e) {
				// This is new card, so emit the event
				Rabta.socket.emit('new marker', {
					lat: Rabta.editBox.getAttribute('data-lat'),
					lng: Rabta.editBox.getAttribute('data-lng'),
					post_text: Rabta.editBox.getElementsByClassName('edit-box-text')[0].value
				});
				// console.log('[.btn-done catch]', e);
			}
			Rabta.editBox.classList.remove('overlay');
		});
		c.addEventListener('click', function(e) {
			Rabta.editBox.classList.remove('overlay');
		})
	},

	initSocketIo: function() {
		Rabta.socket.on('new marker', function(m) {
			Rabta.createMarker(m.lat, m.lng);
			// console.log('[on(new marker)]', m);
		});
	}
};

Rabta.makeMap()
Rabta.initEditBox()
Rabta.initSocketIo()

// test codes
Rabta.test = function() {
	try {
		// check that map exists
		if(!Rabta.map) console.error('[Rabta.map]', Rabta.map);

		// Check getUniqueID is returning a string 
		if(Rabta.getUniqueID().length != 36) console.error('[Rabta.getUniqueID()]')
	} catch (e) {
		console.error('[Some tests failed to execute]', e);
	}
};

Rabta.test();
