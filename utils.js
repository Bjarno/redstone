var util = require('util');
var fs = require("fs");

/**
 * Aid function to return the index of the smallest element of an array,
 * ignorning elements with a certain value (e.g. -1).
 * @param {array} arr The array to search for the smallest value.
 * @param {any} ignores The value that should be ignored.
 * @private
 * @returns The index of the smallest element in the given array, ignoring
 * certain values. If the array only contains ignored value, or is empty,
 * it will return -1, as it is an invalid index.
 */
var array_indexOfSmallest = function array_indexOfSmallest(arr, ignores) {
	var idx = -1;
	var cmp = null;
	for (var i = 0; i < arr.length; i++) {
		var v = arr[i];
		if (v == ignores) { continue; }
		if (cmp === null) {
			cmp = v;
			idx = i;
		} else {
			if (cmp > v) {
				cmp = v;
				idx = i;
			}
		}
	}
	return idx;
};

/**
 * Fully writes an object on standard output using console.log.
 * @param {any} obj The object to dump.
 */
var dump = function dump(obj) {
	console.log(util.inspect(obj, {showHidden: false, depth: null}));
}

/**
 * Reads a file into a string.
 * This is a blocking function.
 * @param {String} path The file path (can be relative)
 * @returns {String} The contents of the file.
 */
var readFile = function readFile(path) {
	return fs.readFileSync(path, "utf-8");
}

var DEBUG = true;

// TODO: JSDoc
var head = function head(title) {
	if (!(DEBUG)) { return; }

	var len = 64;
	var line = "=".repeat(len);
	console.log("");
	console.log(line);
	console.log(" ".repeat((len-title.length)/2) + title);
	console.log(line);
	console.log("");
}

// TODO: JSDoc
var subhead = function subhead(title) {
	if (!(DEBUG)) { return; }

	var len = 64;
	var line = "-".repeat(len);
	console.log("");
	console.log(line);
	console.log(" ".repeat((len-title.length)/2) + title);
	console.log(line);
	console.log("");
}

// TODO: JSDoc
var debugEcho = function debugEcho(a) {
	if (!(DEBUG)) { return; }

	console.log(a);
}

// TODO: JSDoc
var set_debug = function set_debug(flag) {
	DEBUG = flag;
}

exports.array_indexOfSmallest = array_indexOfSmallest;
exports.dump = dump;
exports.readFile = readFile;
exports.head = head;
exports.subhead = subhead;
exports.debugEcho = debugEcho;
exports.set_debug = set_debug;