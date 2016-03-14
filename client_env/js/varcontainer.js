VARC = {};

// TODO: JSDoc
var removeParent = function removeParent(arr, x) {
	// Could be rewritten if there was an in-place Array.filter()
	var idx = -1;
	var found = false;
	arr.forEach(function (val, i) {
		if (val.parent === x) {
			found = true;
			if (val.count === 1) {
				idx = i;
			}
			val.count -= 1;
		}
	});
	if (idx === -1) {
		return found;
	}
	// Delete if last reference
	arr.splice(idx, 1).length; // Is in-place
	return true;
}

// TODO: JSDoc
var addParent = function addParent(arr, x) {
	var found = false;

	arr.forEach(function (val) {
		if (val.parent === x) {
			val.count += 1;
			found = true;
		}
	});

	if (found) {
		return;
	}

	// Create new element
	arr.push({
		parent: x,
		count: 1
	});
}

// TODO: JSDoc
var make_varcontainer = function make_varcontainer(t, i) {
	var varc = {
		target: t,
		proxy: undefined,
		idName: i,
		parents: [] // Parent proxies
	};

	var handler = {
		get: function(target, property, receiver) {
			if (property === "__varc__") {
				return varc;
			} else {
				return target[property];
			}
		},
		set: function(target, property, value, receiver) {
			var oldValue = target[property];
			target[property] = value;
			removeParent(oldValue.__varc__.parents, varc.proxy);
			addParent(value.__varc__.parents, varc.proxy);
		}
	};

	varc.cproxy = new Proxy(t, handler);

	// TODO: Make varcontainers of properties (recursive)

	return varc.proxy;
};

var undo_varcontainer = function undo_varcontainer(proxy) {
	return proxy.__varc__.target;
}

VARC.make = make_varcontainer;
VARC.undo = undo_varcontainer;

/*
Limitation: fails on...

var a = {foo: 123};
var b = VARC.make({bar: a}); // <-- Call of VARC.make() happens in Redstone tool
a.foo = 999;

Works fine if last line is...
b.bar.foo = 999;
*/