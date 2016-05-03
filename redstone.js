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
 * @param {Object} options Object containing settings.
 * @returns {Object} Settings object
 */
var preprocess_settings = function preprocess_settings(options) {
	if (typeof options !== "object") {
		options = {};
	}
	if (!options.hasOwnProperty("random_length")) {
		options.random_length = 32;
	}
	if (!options.hasOwnProperty("selfclosing_backslash")) {
		options.selfclosing_backslash = false;
	}
	if (!options.hasOwnProperty("server_hostname")) {
		options.server_hostname = "localhost";
	}
	if (!options.hasOwnProperty("server_port")) {
		options.server_port = 3000;
	}
	if(!options.hasOwnProperty("include_source")) {
		options.include_source = true;
	}

	return options;
};

/**
 * Builds the Javascript code from the chunks
 * @param {Array} chunks Chunks object containing all chunks.
 * @returns {string} The compound Javascript code for Stip.js
 */
var build_js = function build_js(chunks) {
	var output = "";

	output += chunks.unknown;

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
 * Scans top-level variable definitions given a parsed expression
 * @param expressions Expressions parsed by Esprima to look for variable declarations.
 * @returns {Array} Array containing variable names
 */
var scan_toplevel_variables = function scan_toplevel_variables(expressions) {
	var result = [];

	expressions.forEach(function (expression) {
		if (expression.type == esprima.Syntax.VariableDeclaration) {
			var declarations = expression.declarations;

			declarations.forEach(function (declarator) {
				if (declarator.id.type == esprima.Syntax.Identifier) {
					result.push(declarator.id.name);
				}
			});
		}
	});

	return result;
};

/**
 * Returns the shared variables given an 'unknown' block.
 * @param {String} unknown The unknown block
 * @returns {Array} Array containing shared variables
 */
var get_shared_variables = function get_shared_variables(unknown) {
	var parsed = esprima.parse(unknown);
	return scan_toplevel_variables(parsed.body);
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
 * Generates the object that is going to be passed to STiP of variables, callbacks and shared variables that are going
 * to be generated.
 * @param context The context to use
 * @returns {{methodCalls, identifiers, shared_variables: *}} Object containing variables/expressions that need to be
 * generated in STiP during pre-analysis.
 */
var generate_toGenerate = function generate_toGenerate(context) {
	// Generate list of all identifiers that should be generated
	var toGenerateCallbacks = [];
	var toGenerateIdentifiers = [];
	var toGenerateMethods = context.functionNames;

	// Add callbacks from callbacks
	context.callbacks.forEach(function (callback) {
		toGenerateCallbacks.push(callback.name);
	});

	// Add identifiers from crumbs
	context.crumbs.forEach(function (crumb) {
		crumb.variableNames.forEach(function (varname) {
			toGenerateIdentifiers.push(varname);
		});
	});

	// Aid function, so the list with identifiers are unique
	var uniq = function uniq(a) {
		return Array.from(new Set(a));
	};

	// Join them in one object
	var toGenerate = {
		methodCalls: uniq(toGenerateCallbacks.concat(toGenerateMethods)),
		identifiers: uniq(toGenerateIdentifiers),
		shared_variables: context.shared_variables
	};

	return toGenerate;
};

/**
 * Given the unknown block definition from a chunk, parses and stores the shared variables
 * @param context The context to save the shared variables in
 * @param unknown The unknown block definition
 */
var calculate_shared_variables = function calculate_shared_variables(context, unknown) {
	context.shared_variables = get_shared_variables(unknown);
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
		options  = build_settings(chunks);

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
	dump(options);

	// Pre-process the settings, by supplying the default values
	options = JSON.parse(options);
	options = preprocess_settings(options);
	var context = new ConverterContext(options);
	context.css = css;

	// Store raw_input in context
	context.raw_source = input;

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

	// Calculate shared variables from unknown chunks block
	calculate_shared_variables(context, chunks.unknown);

	// Pass context to Reactify transpiler before starting Stip, so it has access to the crumbs
	require("./jspdg/stip/transpiler/Reactify.js").setContext(context);
	require("./jspdg/stip/transpiler/Node_parse.js").setContext(context);
	var storeInContext = function(a) {
		context.stip = a;
	};
	var storeDeclNode = function (name, declNode) {
		context.varname2declNode[name] = declNode;
	};
	var toGenerate = generate_toGenerate(context);

	// Parse Javascript code using Stip.js
	head("Running Stip");
	var stip_result = tiersplit(js, 'redstone', toGenerate, storeInContext, storeDeclNode); // Passes context for callbacks and reactive information
	var clientJS = escodegen.generate(stip_result[0].program);
	var serverJS = escodegen.generate(stip_result[1].program);

	head("Stip result");
	subhead("Client");
	debugEcho(clientJS);
	subhead("Server");
	debugEcho(serverJS);

	// Add client code to <head> in result tree
	context.clientJS = clientJS;

	// Apply changes, "cached" in context
	result_parse = applier.applyContext(result_parse, context);

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