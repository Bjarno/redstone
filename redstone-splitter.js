/**
 * Dirty scanner function to split a .redstone file and "split" it into
 * both Javascript (@client and @server) code, and the UI code (@ui).
 * While not perfect, it should be able to handle the job well.
 */

var array_indexOfSmallest = require("./utils.js").array_indexOfSmallest;

/**
 * Splits a string document, by using tagged comment blocks.
 * @param {String} input The input file
 * @param {Array} blocks Array of strings of the different blocks.
 * @returns {Object} Object containing key pairs of the different blocks, with
 * its values arrays of the different blocks.
 */
var split = function split(input, blocks) {
	if (blocks === undefined) {
		blocks = ["server", "client", "ui", "css", "settings"];
	}

	var blockcomments = blocks.map(function(val) {
		return "/* @" + val + " */";
	});
	var positions = blockcomments.map(function(val) {
		return input.indexOf(val);
	});
	var smallestidx = array_indexOfSmallest(positions, -1);

	if (smallestidx === -1) {
		return {"unknown": [input]};
	}

	var smallestpos = positions[smallestidx];
	var smallestblockcomment = blockcomments[smallestidx];
	var smallestblock = blocks[smallestidx]

	// Generate input without /* @... */, to find end of block.

	var end = smallestpos;
	var first_input = input.substring(0, end);
	var start = smallestpos + smallestblockcomment.length;
	var last_input = input.substring(start, input.length);

	var rest = split(last_input);
	var unknown = rest.unknown.splice(rest.unknown.length - 1, 1)[0];

	if (rest.hasOwnProperty(smallestblock)) {
		rest[smallestblock].push(unknown);
	} else {
		rest[smallestblock] = [unknown];
	}

	rest.unknown.push(first_input);

	return rest;
}

exports.split = split;