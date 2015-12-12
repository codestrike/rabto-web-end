 // Globals and init setup
var Rabta = {
	map: L.map('map').setView([19, 72.8], 13),
	things: [],
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
		m.addTo(Rabta.map);
	},
	
	// Map
	makeMap: function() {
		L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {maxZoom: 18}).addTo(this.map);
		Rabta.map.on('contextmenu', function(e) {
			console.log(e);
			Rabta.createMarker(e.latlng.lat, e.latlng.lng);
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
		console.error('[Some tests failed to execte]', e);
	}
};

Rabta.test();
