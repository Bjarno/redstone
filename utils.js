var esprima = require("esprima");

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

var util = require('util');
var dump = function dump(obj) {
	console.log(util.inspect(obj, {showHidden: false, depth: null}));
}

exports.array_indexOfSmallest = array_indexOfSmallest;
exports.dump = dump;