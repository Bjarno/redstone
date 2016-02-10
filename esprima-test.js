var esprima = require("esprima");

var util = require('util');
var dump = function dump(obj) {
	console.log(util.inspect(obj, {showHidden: false, depth: null}));
}

dump(esprima.parse("hello(\"world\")"));