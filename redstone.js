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
var debugEcho = require("./utils.js").debugEcho;
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
	debugEcho(ui);
	subhead("Javascript");
	debugEcho(js);

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

	head("New Javascript after Pre-process");
	debugEcho(js);

	head("Callbacks");
	dump(context.callbacks);

	// Parse Javascript code using Stip.js
	head("Running Stip");
	var callbackNames = context.callbacks;
	var stip_result = tiersplit(js, callbackNames);
	var clientJS = escodegen.generate(stip_result[0].program);
	var serverJS = escodegen.generate(stip_result[1].program);

	head("Stip result");
	subhead("Client");
	debugEcho(clientJS);
	subhead("Server");
	debugEcho(serverJS);

	// Dumb replace server creation (TODO: Change this in Stip)
	serverJS = serverJS.replace("var server = new ServerRpc(serverHttp, {});", "var server = new ServerRpc();")

	// Prefix ServerRpc node module
	serverJS = "var ServerRpc = require(\"rpc\");\n" + serverJS;

	// Add client code to <head> in result tree
	context.js.push(clientJS);

	// Apply changes, "cached" in context
	preparer.applyContext(result_parse, context);
	
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