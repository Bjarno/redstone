var redstoneparser = require("./redstone-parser.js");
var redstoneconverter = require("./redstone-converter.js");

var fs = require("fs");
var input = fs.readFileSync("input.red", "utf-8");

var util = require('util');
var dump = function dump(obj) {
	console.log(util.inspect(obj, {showHidden: false, depth: null}));
}

var result_parse = redstoneparser.parse(input);
var result_html = redstoneconverter.generate(result_parse);

dump(result_html);

console.log(result_html.html);