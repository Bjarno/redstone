var parser = require("./redstone-parser.js");
var converter = require("./redstone-converter.js");
var preparer = require("./redstone-preparer.js");

var ConverterContext = require("./redstone-types.js").ConverterContext;

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

var generate = function generate(input, options) {
	options = preprocess_options(options);
	var context = new ConverterContext([], [], options);

	var result_parse = parser.parse(input);
	preparer.prepare(result_parse, context);
	var result_html = converter.generate(result_parse, context);

	return {html: result_html, "context": context};
};

exports.generate = generate;