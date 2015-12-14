 // Globals and init setup
var Rabta = {
	map: L.map('map').setView([19, 72.8], 13),
	editBox: document.getElementsByClassName('edit-box')[0],
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
	},

	// Popup
	getPopupFor: function(id) {
		return (new DOMParser)
			.parseFromString(`<div class="card">
					<section class="head">
						<strong class="author">${id}</strong>
					</section>
					<div style="background-image:url('/img/b.jpg')" class="hero"></div>
					<div class="foot">
						<button class="btn btn-edit" data-id="popup-${id}">Edit</button>
					</div>
				</div>`, 'text/html')
			.lastChild.innerHTML;
	},

	// Edit Box
	showEditBox: function(popup, event) {
		console.log('Yay! p', popup);
		Rabta.editBox.classList.add('overlay');
	},
	
	// Map
	makeMap: function() {
		L.tileLayer('http://{s}.jtile.osm.org/{z}/{x}/{y}.png', {maxZoom: 18}).addTo(this.map);
		Rabta.map
		.on('contextmenu', function(e) {
			// console.log(e);
			Rabta.createMarker(e.latlng.lat, e.latlng.lng);
		})
		.on('popupopen', function(e) {
			var p = document.getElementsByClassName('btn-edit')[0];
			p.addEventListener('click', function(e) {
				Rabta.showEditBox(p, e);
			});
		});
	}
};

Rabta.makeMap()

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
