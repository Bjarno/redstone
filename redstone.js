var splitter = require("./redstone-splitter.js");
var parser = require("./redstone-parser.js");
var generator = require("./redstone-generator.js");
var preparer = require("./redstone-preparer.js");
var escodegen = require("escodegen");
var tiersplit = require("./jspdg/stip/tiersplit.js").tiersplit;

var ConverterContext = require("./redstone-types.js").ConverterContext;

var dump = require("./utils.js").dump;
var head = require("./utils.js").head;
var subhead = require("./utils.js").subhead;
var readFile = require("./utils.js").readFile;

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
	// Split input into Redstone, and Javascript
	var chunks = splitter.split(input);
	var ui = chunks.ui.join("\n");
	var js = chunks.unknown + "\n" +
	        "/* @client */" + chunks.client.join("\n") + "\n" +
	        "/* @server */" + chunks.server.join("\n");

	head("Raw chunks");
	dump(chunks);

	head("Parsed input");
	subhead("UI");
	console.log(ui);
	subhead("Javascript");
	console.log(js);

	// Preprocess the options, by supplying the default values
	options = preprocess_options(options);
	var context = new ConverterContext([], [], options);

	// Parse the tree
	var result_parse = parser.parse(ui);
	head("Parse result");
	dump(result_parse);

	// Install callbacks and crumbs for dynamic content
	preparer.prepare(result_parse, context);
	head("Pre-process result");
	subhead("Trees");
	dump(result_parse);
	subhead("Context");
	dump(context);

	// Parse Javascript code using Stip.js
	var stip_result = tiersplit(js);
	var clientJS = escodegen.generate(stip_result[0].program);
	var serverJS = escodegen.generate(stip_result[1].program);

	// TODO: Add client code to <head> in result tree

	// Generate the resulting HTML
	preparer.applyContext(result_parse, context);
	var result_html = generator.generate(result_parse, context);

	// Output result
	head("Result");
	subhead("Resulting HTML");
	console.log(result_html);
	subhead("Resulting Server code (Node)");
	console.log(serverJS);

	return {html: result_html, "context": context};
};

exports.generate = generate;