var parser = require("./redstone-parser.js");
var generator = require("./redstone-generator.js");
var preparer = require("./redstone-preparer.js");

var ConverterContext = require("./redstone-types.js").ConverterContext;

var dump = require("./utils.js").dump;

var DEBUG = true;

/**
 * Fills in the default values for an options object. It will create (and 
 * return) an empty options object with all default options, if an invalid
 * one is given.
 * @param {Object} Object containing options.
 */
var preprocess_options = function preprocess_options(options) {
	if (typeof options !== "object") {
		options = {};
	}
	if (!(options.hasOwnProperty("random_length"))) {
		options.random_length = 32;
	}
	if (!(options.hasOwnProperty("selfclosing_backslash"))) {
		options.selfclosing_backslash = false;
	}
	return options;
};

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
var generate = function generate(input, options) {
	options = preprocess_options(options);
	var context = new ConverterContext([], [], options);

	var result_parse = parser.parse(input);
	head("Parse result");
	dump(result_parse);

	preparer.prepare(result_parse, context);
	head("Pre-process result");
	subhead("Trees");
	dump(result_parse);
	subhead("Context");
	dump(context);

	preparer.applyContext(result_parse, context);
	var result_html = generator.generate(result_parse, context);

	head("Resulting HTML");
	dump(result_html);

	return {html: result_html, "context": context};
};

// TODO: JSDoc
var set_debug = function set_debug(flag) {
	DEBUG = flag;
}

exports.generate = generate;
exports.set_debug = set_debug;