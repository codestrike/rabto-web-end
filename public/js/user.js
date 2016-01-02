 // Globals and init setup
var Rabta = {
	map: L.map('map').setView([19, 72.8], 13),
	socket: io(),
	things: {},

	// Marker
	createMarker: function(lat, lng, id) {
		// console.log('[createMarker()]', lat, lng, id);
		if (!lat || !lng) return;

		// change popup binding from on create to on click, :) On Demand
		Rabta.socket.emit('old popups', {id:id});
		
		var m = L.marker([lat, lng]);
		m.id = id;
		Rabta.things[m.id + '-marker'] = m;
		m.addTo(Rabta.map);
	},

	getAllMarkersInTheView: function() {
		// TODO detect the view and only get markers for that view
		// view is a rectangular area made by lat and lng, [0,0,0,0] is substitute as sever don't care about view
		Rabta.socket.emit('old markers', {view: [0,0,0,0]});
		// console.log('[getAllMarkersInTheView()]');
	},

	// Image resizing function
       getResizedUrl: function(url, height, width) {
               return url.replace(/upload\/\w+/i,`upload/w_${width},h_${height},c_fill`);
       },


	// Popup
	getPopupFor: function(popup) {
		return (new DOMParser)
			.parseFromString(`<div class="card popup-card" data-popup-id="${popup.id}">
					<section class="head">
						<!-- strong class="author">Dummy Bell</strong -->
						<p class="text">${popup.post_text}</p>
					</section>
					<div style="background-image:url('${Rabta.getResizedUrl(popup.post_image, 300, 300)}')" class="hero"></div>
					<!-- div class="foot">
						<button class="btn btn-edit">Edit</button>
						<button class="btn btn-delete">Delete</button>
					</div -->
				</div>`, 'text/html')
			.lastChild.innerHTML;
	},
	
	// Map
	makeMap: function() {
		// Bootup map
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 18}).addTo(Rabta.map);
		
		// Get exising markers
		Rabta.getAllMarkersInTheView();
	},

	initSocketIo: function() {
		Rabta.socket
		.on('new marker', function(marker) {
			Rabta.createMarker(marker.lat, marker.lng, marker.id);
			// console.log('[on(new marker)]', marker);
		})
		.on('old markers', function(markers) {
			markers.forEach(function(marker) {
				Rabta.createMarker(marker.lat, marker.lng, marker.id);
				// console.log('[on(old markers)]', marker);
			});
		})
		.on('new popup', function(popup) {
			console.log(popup);
			Rabta.things[popup.marker + '-marker'].bindPopup(Rabta.getPopupFor(popup));
			Rabta.things[popup.id + '-popup'] = popup;
		})
		.on('old popups', function(popups) {
			popups.forEach(function(popup) {
				Rabta.things[popup.marker + '-marker'].bindPopup(Rabta.getPopupFor(popup));
				Rabta.things[popup.id + '-popup'] = popup;
				// console.log('[on(old popups)]', popup, Rabta.getPopupFor(popup));
			});
		})
		.on('modified popup', function(popup) {
			Rabta.things[popup.marker + '-marker'].unbindPopup();
			Rabta.things[popup.marker + '-marker'].bindPopup(Rabta.getPopupFor(popup));
			Rabta.things[popup.id + '-popup'] = popup;
		})
		.on('delete marker', function(id) {
			Rabta.map.removeLayer(Rabta.things[id + '-marker']);
			delete Rabta.things[id + '-marker'];
		})
	}
};

Rabta.makeMap()
Rabta.initSocketIo()