var Tag            = require("./redstone-types.js").Tag;
var DynamicExpression = require("./redstone-types.js").DynamicExpression;

var randomstring = require("randomstring");
var esprima = require("esprima");

/**
 * Recursively finds all the variable names in the given expression for 
 * a function's arguments.
 * @param {Expression} expression The expression to look for variable names for.
 * @private
 * @returns {Array} List of variable names in this expression.
 */
var find_varnames_expression = function find_varnames_expression(expression) {
	switch (expression.type) {
		case esprima.Syntax.Literal:
			return [];

		case esprima.Syntax.BinaryExpression:
			var result = find_varnames_expression(expression.left);
			result = result.concat(find_varnames_expression(expression.right));
			return result;

		case esprima.Syntax.Identifier:
			return [expression.name];

		default:
			throw "Unknown ExpressionStatement type '" + expression.type + "'.";
	}
};

/**
 * Finds all the variable names in the argument.
 * @param {Argument} argument The argument of a function to find variable names
 * in.
 * @private
 * @returns {Array} List of variable names in the argument.
 */
var find_varnames_argument = function find_varnames_argument(argument) {
	// Note about arguments:
	// Args can only be identifiers, literals or combination using
	// BinaryExpressions.

	var type = argument.type;

	switch (type) {
		case esprima.Syntax.Literal:
			return [];

		case esprima.Syntax.Identifier:
			return [argument.name];

		case esprima.Syntax.ExpressionStatement:
			var expression = argument.expression;
			return find_varnames_expression(expression);

		default:
			throw "Unknown type " + type + " of statement as argument.";
	}
};

/**
 * Finds all the variable names in the arguments.
 * Results are filtered, so each variable name only occurs once.
 * @param {Array} args List of arguments of a method call.
 * @private
 * @returns {Array} List of variable names as Strings.
 */
var find_varnames_arguments = function find_varnames_arguments(args) {
	var result = [];

	var subresult;
	for (var i = 0; i < args.length; i++) {
		var argument = args[i];
		subresult = find_varnames_argument(argument);
		result.concat(subresult);
	}

	var filteredResult = result.filter(function(item, pos, self) {
		return self.indexOf(item) == pos;
	});

	return filteredResult;
};

/**
 * Parses an AST tree of a dynamic expression, and outputs the type, and 
 * information about the arguments (variable names) if it is a method call,
 * or how to treat the object (simple identifier, or a member expression).
 * @param {AST} AST The AST tree of a dynamic expression.
 * @private
 * @returns {Object} Object with the type of the expression (key: type), and
 * depending on the type, more information about the variable names of the
 * arguments if it is a method call.
 */
var parse_ast = function parse_ast(AST) {
	if (AST.type !== esprima.Syntax.Program) {
		throw "AST should start with Program";
	}

	var body = AST.body;
	if (body.length != 1) {
		throw "Literal expression should only have one expression.";
	}

	var statement = body[0];
	if (statement.type !== esprima.Syntax.ExpressionStatement) {
		throw "The inner contents of a literal expression should be, as the name " +
		      " applies, an expression.";
	}

	var expression = statement.expression;

	switch (expression.type) {
		 case esprima.Syntax.Identifier:
			var varname = expression.name;
			return {
				"type": "Identifier",
				"variable": varname
			};

		 case esprima.Syntax.CallExpression:
			var callee = expression.callee;
			var args = expression.arguments;

			// Get variablenames in arguments
			var varnames = find_varnames_arguments(args);

			// Check if format is obj.func(args) or func(args)
			
			switch (callee.type) {
				case esprima.Syntax.Identifier:
					return {
						"type": "SimpleCallExpression",
						"variables": varnames,
						"function": callee.name
					};

				case esprima.Syntax.MemberExpression:
					if (callee.computed) {
						throw "Unknown what to do when value is computed.";
					}

					if (callee.object.type !== esprima.Syntax.Identifier) {
						throw "Only supports identifiers for MemberExpressions's object.";
					}

					if (callee.property.type !== esprima.Syntax.Identifier) {
						throw "Only supports identifiers for MemberExpressions's property.";
					}
					
					return {
						"type": "MemberCallExpression",
						"variables": varnames,
						"property": callee.property.name,
						"object": callee.object.name
					};

				default:
					throw "Unsupported type of CallExpression.";
			}
			break;

		 case esprima.Syntax.MemberExpressions:
			if (expression.computed) {
				throw "Unknown what to do when value is computed.";
			}

			var object = expression.object;
			var property = expression.property;

			if (object.type !== esprima.Syntax.Identifier) {
				throw "Only supports identifiers for MemberExpression's object.";
			}

			if (property.type !== esprima.Syntax.Identifier) {
				throw "Only supports identifiers for MemberExpression's property.";
			}

			return {
				"type": "MemberExpression",
				"variables": [],
				"property": property.name,
				"object": object.name
			};

		 default:
			throw "Unsupported type of Expression.";
	}
};

// TODO: JSDoc
var install_crumbs_identifier = function install_crumbs_identifier(id, parsed) {
	// abc
	// TODO: Finish procedure
};

// TODO: JSDoc
var install_crumbs_call = function install_crumbs_call(id, parsed) {
	// abc(args)
	// TODO: Finish procedure
};

// TODO: JSDoc
var install_crumbs_membercall = function install_crumbs_membercall(id, parsed) {
	// abc.def(args)
	// TODO: Finish procedure
};

// TODO: JSDoc
var install_crumbs_memberexpr = function install_crumbs_memberexpr(id, parsed) {
	// abc.def
	// TODO: Finish procedure
};

/**
 * Returns the correct crumbs installer, depending on the type of a dynamic
 * expression.
 * @param {String} type The type of the dynamic expression.
 * @private
 * @returns {Callback} Function to install the correct crumbs.
 */
var dispatch_install_crumbs = function dispatch_install_crumbs(type) {
	switch (type) {
		case "Identifier": // abc
			return install_crumbs_identifier;

		case "CallExpression": // abc(args)
			return install_crumbs_call;

		case "MemberCallExpression": // abc.def(args)
			return install_crumbs_membercall;

		case "MemberExpression": // abc.def
			return install_crumbs_memberexpr;

		default:
			throw "Unknown type";
	}
};

/**
 * Returns the id of a tag, generates a random one if none is given.
 * @param {Tag} tag The tag to find (or generate) an id for.
 * @returns {String} The id of the tag
 */
var get_id = function get_id(context, tag) {
	var id = tag.id;
	if (typeof id === "string") {
		return id;
	}

	var len = context.random_length;
	id = randomstring.generate(len);
	tag.id = id;
	return id;
};

/**
 * Generates Javascript code to install an event listener.
 * @param {ConverterContext} context The context to use.
 * @param {Tag} tag The tag that should be used to link the callback to the
 * event.
 * @param {String} ev The event to use. Assumes $(...).<event> exists.
 * @param {String} callback Name of the global callback function.
 * @private
 */
var generate_js_event = function generate_js_event(context, tag, ev, callback) {
	if (tag.tagname === "html") {
		throw "NYI";
	}

	var id = get_id(context, tag);
	var js = "$(\"#" + id + "\")." + ev + "(" + callback + ");";
	return js;
};

/**
 * Prepares a dynamic expression.
 * @param {ConverterContext} context The context to use.
 * @param {DynamicExpression} dynamic The segment to generate code for.
 * @private
 */
var prepare_dynamic = function generate_dynamic(context, dynamic) {
	var randomId = randomstring.generate(context.random_length);
	var expression = dynamic.expression;
	var AST = esprima.parse(expression);
	var parsedExpression = parse_ast(AST);

	dynamic.idName = randomId;

	// Install breadcrumbs in context, depending on type
	var func = dispatch_install_crumbs(parsedExpression.type);
	func(randomId, parsedExpression);
};

/**
 * Prepares a tree, looking for dynamic segments and callback installers.
 * @param {Tag} tree The tree to handle.
 * @param {ConverterContext} context The context to use.
 * @private
 */
var prepare_tree = function prepare_tree(tree, context) {
	if (typeof tree == "string") {
		return;
	}
	if (tree instanceof DynamicExpression) {
		return prepare_dynamic(context, tree);
	}

	// Install callbacks
	var attributes = tree.attributes;
	for (var name in attributes) {
		if (attributes.hasOwnProperty(name)) {
			if (name[0] == "@") {
				var ev = name.substring(1, name.length);
				var callback = attributes[name];
				var js = generate_js_event(context, tree, ev, callback);
				context.js.push(js);
			}
		}
	}

	// Loop over content of the tree.
	tree.content.forEach(function(subtree) {
		prepare_tree(subtree, context);
	});
};

/**
 * Generates crumbs for dynamic content, and generates
 * Javascript for installing callbacks.
 * @param {Array} input Array of HTML trees.
 * @param {ConverterContext} context The context to use.
 */
var prepare = function prepare(input, context) {
	input.forEach(function(tree) {
		prepare_tree(tree, context);
	});
};

var generate_innerjs = function generate_innerjs(js) {
	var result = "$(document).ready(function() {";

	js.forEach(function(block) {
		result += "\n" + block;
	});

	result += "\n});";

	return result;
}

/**
 * Includes Javascript rules and external libraries into the HTML trees.
 * @param {Array} input Array of HTML trees.
 * @param {ConverterContext} context The context to use.
 */
var applyContext = function applyContent(input, context) {
	input.forEach(function(tree) {
		if (tree.tagname === "head") {
			// Add jQuery
			var jquery = new Tag("script");
			jquery.attributes.src = "https://code.jquery.com/jquery-2.2.0.min.js";
			tree.content.push(jquery);

			// Add generated Javascript
			var scripttag = new Tag("script");
			var innerJs = generate_innerjs(context.js);
			scripttag.content.push("\n" + innerJs + "\n");
			tree.content.push(scripttag);
		}
	});
}

exports.prepare = prepare;
exports.applyContext = applyContext;