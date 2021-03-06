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

	// Image resizing function
	getResizedUrl: function(url, height, width) {
		return url.replace(/upload\/\w+/i,`upload/w_${width},h_${height},c_fill`);
	},

	// Marker
	createMarker: function(lat, lng, id) {
		// console.log('[createMarker()]', lat, lng, id);
		if (!lat || !lng) return;

		// change popup binding from on create to on click, :) On Demand
		// Rabta.socket.emit('old popups', {id:id});
		
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

	// Popup
	getPopupFor: function(popup) {
		console.log('[getPopupFor()]', popup);
		return (new DOMParser)
			.parseFromString(`<div class="card popup-card" data-popup-id="${popup.id}">
					<section class="head">
						<strong class="author">Dummy Bell</strong>
						<p class="text">${popup.post_text}</p>
					</section>
					<div style="background-image:url('${Rabta.getResizedUrl(popup.post_image, 300, 300)}')" class="hero"></div>
					<div class="foot">
						<button class="btn btn-edit">Edit</button>
						<button class="btn btn-delete">Delete</button>
					</div>
				</div>`, 'text/html')
			.lastChild.innerHTML;
	},

	// Edit Box
	showEditBox: function(lat, lng) {
		try {
			var popup = document.getElementsByClassName('popup-card')[0];
			Rabta.editBox.getElementsByClassName('edit-box-text')[0].value = popup.getElementsByClassName('text')[0].innerHTML;
			Rabta.editBox.getElementsByClassName('image')[0].setAttribute('hidden', true);

			if (window.getComputedStyle(document.body).backgroundBlendMode) {
				var post_image = Rabta.things[popup.getAttribute('data-popup-id') + '-popup'].post_image;
				Rabta.editBox.style.backgroundImage = `url('${Rabta.getResizedUrl(post_image, 300, 300)}')`;
				Rabta.editBox.style.backgroundSize = 'cover';
				Rabta.editBox.style.backgroundBlendMode = 'color-dodge';
			}
		} catch (e) {
			// There is no .popup-card => this is new card
			// console.log('[Will create a new card on .btn-done]');
			Rabta.editBox.setAttribute('data-lat', lat);
			Rabta.editBox.setAttribute('data-lng', lng);
			Rabta.editBox.getElementsByClassName('image')[0].removeAttribute('hidden');
		}
		Rabta.editBox.classList.add('overlay');
	},
	
	// Map
	makeMap: function() {
		// Bootup map
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 18}).addTo(Rabta.map);
		
		// Get exising markers
		Rabta.getAllMarkersInTheView();

		// Set event listeners 
		Rabta.map
		.on('contextmenu', function(e) {
			Rabta.showEditBox(e.latlng.lat, e.latlng.lng);
			// Rabta.socket.emit('new marker', {lat:e.latlng.lat, lng:e.latlng.lng});
		})
		.on('popupopen', function(e) {
			var p = document.getElementsByClassName('btn-edit')[0];
			p.addEventListener('click', function(e) {
				Rabta.showEditBox(p, e);
			});

			var deleteBtn = document.getElementsByClassName("btn-delete")[0];
			deleteBtn.addEventListener('click', function(e) {
				if (confirm('Are you determined enough to delete this ?')) {
					var popupId = document.getElementsByClassName('popup-card')[0].getAttribute('data-popup-id');
					var popup = Rabta.things[popupId + '-popup'];
					Rabta.socket.emit('delete marker', popup.marker);
					console.log('[makeMap.on popupopen confirm]', popup.marker);
				}
				console.log('[makeMap.on popupopen]', deleteBtn);
			});
		});
	},

	initEditBox: function() {
		var d = Rabta.editBox.getElementsByClassName('btn-edit-done')[0];
		var c = Rabta.editBox.getElementsByClassName('btn-edit-cancel')[0];
		var img = Rabta.editBox.getElementsByClassName("image")[0];
		var post_image = '';

		//convert image into base64
		img.addEventListener('change',function(e){
			var fileReader = new FileReader();
			if(img.files[0].name.length>0){
				fileReader.readAsDataURL(img.files[0]);
				fileReader.onload = function(fileLoadEvent){
					 post_image = fileLoadEvent.target.result;
					console.log("[Client msg ]	" ,post_image);
			}
			}
		});

		d.addEventListener('click', function(e) {
			var post_text = Rabta.editBox.getElementsByClassName('edit-box-text')[0].value;
			try {
				var popup = document.getElementsByClassName('popup-card')[0];
				popup.getElementsByClassName('text')[0].innerHTML = post_text;

				Rabta.socket.emit('modified popup', {
					id: popup.getAttribute('data-popup-id'),
					post_text: post_text
				});
				// console.log('[.btn-done click]', popup);
			} catch (e) {
				// This is new card, so emit the event
				Rabta.socket.emit('new marker', {
					lat: Rabta.editBox.getAttribute('data-lat'),
					lng: Rabta.editBox.getAttribute('data-lng'),
					post_text: post_text,
					post_image: post_image
				});
				// console.log('[.btn-done catch]', Rabta.editBox.getAttribute('data-lat'), Rabta.editBox.getAttribute('data-lng'));
			}
			Rabta.editBox.classList.remove('overlay');
		});

		c.addEventListener('click', function(e) {
			Rabta.editBox.classList.remove('overlay');
		});
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
				Rabta.socket.emit('old popups', {id:marker.id});
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
Rabta.initEditBox()

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
