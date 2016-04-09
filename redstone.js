var splitter = require("./redstone-splitter.js");
var parser = require("./redstone-parser.js");
var generator = require("./redstone-generator.js");
var preparer = require("./redstone-preparer.js");
var applier = require("./redstone-applier.js");

var escodegen = require("escodegen");
var tiersplit = require("./jspdg/stip/tiersplit.js").tiersplit;

var ConverterContext = require("./redstone-types.js").ConverterContext;

var dump = require("./utils.js").dump;
var head = require("./utils.js").head;
var subhead = require("./utils.js").subhead;
var debugEcho = require("./utils.js").debugEcho;
var readFile = require("./utils.js").readFile;

/**
 * Fills in the default values for an settings object. It will create (and 
 * return) an empty settings object with all default settings, if an invalid
 * one is given.
 * @param {Object} Object containing settings.
 */
var preprocess_settings = function preprocess_settings(settings) {
	if (typeof settings !== "object") {
		settings = {};
	}
	if (!(settings.hasOwnProperty("random_length"))) {
		settings.random_length = 32;
	}
	if (!(settings.hasOwnProperty("selfclosing_backslash"))) {
		settings.selfclosing_backslash = false;
	}
	return settings;
};

// TODO: JSDoc
var generate = function generate(input) {
	// Split input into Redstone, and Javascript
	var chunks = splitter.split(input);
	var ui       = chunks.ui.join("\n");
	var js       = chunks.unknown + "\n" +
	               "/* @client */" + chunks.client.join("\n") + "\n" +
	               "/* @server */" + chunks.server.join("\n"),
	    css      = (chunks.hasOwnProperty("css") ? chunks.css.join("\n") : false),
	    settings = (chunks.hasOwnProperty("settings") ? chunks.settings : {});

	head("Raw chunks");
	dump(chunks);

	head("Parsed input");
	subhead("UI");
	debugEcho(ui);
	subhead("Javascript");
	debugEcho(js);
	subhead("CSS");
	debugEcho(css);
	subhead("Settings");
	dump(settings);

	// Preprocess the settings, by supplying the default values
	settings = preprocess_settings(settings);
	var context = new ConverterContext(settings);
	context.css = css;

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
	head("Running Stip");
	var stip_result = tiersplit(js, context); // Passes context for callbacks and reactive information
	var clientJS = escodegen.generate(stip_result[0].program);
	var serverJS = escodegen.generate(stip_result[1].program);

	head("Stip result");
	subhead("Client");
	debugEcho(clientJS);
	subhead("Server");
	debugEcho(serverJS);

	// Add client code to <head> in result tree
	context.js.push(clientJS);

	// Apply changes, "cached" in context
	applier.applyContext(result_parse, context);
	
	// Generate the resulting HTML
	var result_html = generator.generate(result_parse, context);

	// Output result
	head("Result");
	subhead("Resulting HTML");
	debugEcho(result_html);
	subhead("Resulting Server code (Node)");
	debugEcho(serverJS);

	return {client: result_html, server: serverJS, "context": context};
};

exports.generate = generate;