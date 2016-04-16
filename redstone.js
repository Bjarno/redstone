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

/**
 * Fills in the default values for an settings object. It will create (and
 * return) an empty settings object with all default settings, if an invalid
 * one is given.
 * @param {Object} settings Object containing settings.
 */
var preprocess_settings = function preprocess_settings(settings) {
	if (typeof settings !== "object") {
		settings = {};
	}
	if (!settings.hasOwnProperty("random_length")) {
		settings.random_length = 32;
	}
	if (!settings.hasOwnProperty("selfclosing_backslash")) {
		settings.selfclosing_backslash = false;
	}
	if (!settings.hasOwnProperty("server_hostname")) {
		settings.server_hostname = "localhost";
	}
	if (!settings.hasOwnProperty("server_port")) {
		settings.server_port = 3000;
	}

	return settings;
};

/**
 * Builds the Javascript code from the chunks
 * @param {Array} chunks Chunks object containing all chunks.
 * @returns {string} The compound Javascript code for Stip.js
 */
var build_js = function build_js(chunks) {
	var output = chunks.unknown + "\n";

	output += "/* @client */";
	if (chunks.client.length > 0) {
		output += chunks.client.join("\n") + "\n";
	} else {
		output += "{}";
	}

	output += "/* @server */";
	if (chunks.server.length > 0) {
		output += chunks.server.join("\n") + "\n";
	} else {
		output += "{}";
	}
	
	return output;
};

/**
 * Builds the CSS code from the chunks
 * @param {Array} chunks Chunks object containing all chunks.
 * @returns {string} The final CSS code
 */
var build_css = function build_css(chunks) {
	var output = "";

	if (chunks.css.length > 0) {
		output += chunks.css.join("\n");
	}

	return output;
};

/**
 * Builds the settings string from the chunks.
 * @param {Array} chunks Chunks object containing all chunks.
 * @returns {string} The final settings object, as a string
 */
var build_settings = function build_settings(chunks) {
	if (chunks.settings.length == 1) {
		return chunks.settings[0];
	} else if (chunks.settings != 0) {
		throw "Only one @settings block allowed";
	} else {
		return "{}";
	}
};

/**
 * Builds the User Interface string from the chunks
 * @param {Array} chunks Chunks object containing all chunks.
 * @returns {string} The final User Interface definitions
 */
var build_ui = function build_ui(chunks) {
	return chunks.ui.join("\n");
};

/**
 * Runs the redstone tool on the given input
 * @param {String} input The text input file
 * @returns {Object} Object containing the client HTML code (key: client), server Javascript code (key: server) and the
 * final context with extra information (key: context).
 */
var generate = function generate(input) {
	// Split input into Redstone, and Javascript
	var chunks = splitter.split(input);
	var ui       = build_ui(chunks);
	var js       = build_js(chunks),
		css      = build_css(chunks),
		settings = build_settings(chunks);

	head("Raw chunks");
	dump(chunks);

	head("Parsed input");
	subhead("UI");
	debugEcho(ui);
	subhead("Javascript");
	debugEcho(js);
	subhead("CSS");
	debugEcho(css ? css : "none");
	subhead("Settings");
	dump(settings);

	// Pre-process the settings, by supplying the default values
	settings = JSON.parse(settings);
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

	// Return result
	return {client: result_html, server: serverJS, "context": context};
};

exports.generate = generate;