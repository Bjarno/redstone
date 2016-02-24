var splitter = require("./redstone-splitter.js");
var parser = require("./redstone-parser.js");
var generator = require("./redstone-generator.js");
var preparer = require("./redstone-preparer.js");

var ConverterContext = require("./redstone-types.js").ConverterContext;

var dump = require("./utils.js").dump;
var head = require("./utils.js").head;
var subhead = require("./utils.js").subhead;

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
var generate = function generate(input, options) {
	var chunks = splitter.split(input);
	var ui = chunks.ui;
	var js = chunks.unknown + "\n" +
	        "/* @client */" + chunks.client + "\n" +
	        "/* @server */" + chunks.server;

	head("Raw chunks");
	dump(chunks);

	head("Parsed input");
	subhead("UI");
	console.log(ui);
	subhead("Javascript");
	console.log(js);
	return false;

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
	console.log(result_html);

	return {html: result_html, "context": context};
};

exports.generate = generate;