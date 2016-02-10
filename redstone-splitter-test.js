var redstonesplitter = require("./redstone-splitter.js");

var fs = require("fs");
var input = fs.readFileSync("input2", "utf-8");

var util = require('util');
var dump = function dump(obj) {
	console.log(util.inspect(obj, {showHidden: false, depth: null}));
}

dump(redstonesplitter.split(input));