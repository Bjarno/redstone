var redstoneparser = require("./redstone-parser.js");
var fs = require("fs");
var input = fs.readFileSync("input.redstone", "utf-8");

var util = require('util');
var dump = function dump(obj) {
	console.log(util.inspect(obj, {showHidden: false, depth: null}));
}

var result = redstoneparser.parse(input);

dump(result);