// Wrapper on watch.js, as watch.js does not allow multiple "watches" on the same object.
// Will keep track of a list of watchers (listeners/observers), and cleans up watching
// when there are no observers left.

var debug = true;

var watcher = function(prop, action, difference, oldvalue) {
	// Call listeners
	var fullnewvalue = this;

	if (debug) {
		console.log("Detected update!");
		console.log("Prop: ");
		console.log(prop);
		console.log("Action: ");
		console.log(action);
		console.log("Difference: ");
		console.log(difference);
		console.log("Oldvalue: ");
		console.log(oldvalue);
		console.log("Fullnewvalue: ");
		console.log(this);
	}

	this.__varspy__.listeners.forEach(function (keyandlistener) {
		var listener = keyandlistener.listener;
		listener(prop, action, difference, oldvalue, fullnewvalue);
	});

	if (debug) {
		console.log("-----------------------------------------------------------");
	}
}

var VARSPY = {};
VARSPY.track = function(obj, func, givenKey) {
	var startWatch = false;
	var key, idx;

	var desc = Object.getOwnPropertyDescriptor(obj, '__varspy__');
	if (desc === undefined) {
		key = (givenKey === undefined) ? makeId() : givenKey;
		Object.defineProperty(obj, '__varspy__', {
            enumerable: false,
            configurable: true,
            writable: false,
            value: {
            	listeners: [{
            		key: key,
            		listener: func
            	}]
            }
        });
        startWatch = true;
	} else {
		if (givenKey === undefined) {
			do {
				key = makeId();
				idx = -1;
				obj.__varspy__.listeners.forEach(function (keyandlistener, i) {
					if (keyandlistener.key === key) {
						idx = i;
					}
				});
			} while (idx !== -1);
		} else {
			// Generate really unique key
			key = givenKey;
		}

		obj.__varspy__.listeners.push({
			key: key,
			listener: func
		});
	}

	if (startWatch) {
		watch(obj, watcher, undefined, true);	
	}

	return key;
};

VARSPY.untrack = function(obj, key) {
	var idx = -1;
	obj.__varspy__.listeners.forEach(function (keyandlistener, i) {
		if (keyandlistener.key === key) {
			idx = i;
		}
	});

	if (idx === -1) {
		return false;
	}

	// Remove element
	obj.__varspy__.listeners.splice(idx, 1);

	// "Half" Cleanup
	if (obj.__varspy__.listeners.length === 0) {
		if (debug) {
			console.log("Stopped tracking an object.");
			console.log(obj);
		}
		unwatch(obj);
	}
	// We could remove __varspy__ but it can safely remain there with an empty array, not that huge waste of space.

	return true;
}