var Tag            = require("./redstone-types.js").Tag;
var DynamicExpression = require("./redstone-types.js").DynamicExpression;

var randomstring = require("randomstring");
var esprima = require("esprima");
var escodegen = require("escodegen");

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
 			"varname": varname
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
 var generate_js_callback = function generate_js_callback(context, tag, ev, callback) {
 	if (tag.tagname === "html") {
 		throw "NYI";
 	}

	context.callbacks.push(callback); // Makes sure that Stip knows it is called on client-side

	var id = get_id(context, tag);
	var js = "$(\"#" + id + "\")." + ev + "(" + callback + ");";
	context.js.push(js);
};

/**
 * Prepares a dynamic expression.
 * @param {ConverterContext} context The context to use.
 * @param {DynamicExpression} dynamic The segment to generate code for.
 * @private
 */
 var prepare_dynamic = function generate_dynamic(context, dynamic) {
 	// Prefix with r, as first character can be a number, and r = reactivity.
 	var randomId = "r" + randomstring.generate(context.random_length);
 	var expression = dynamic.expression;
 	var AST = esprima.parse(expression);
 	var parsedExpression = parse_ast(AST);

 	dynamic.idName = randomId;

 	context.crumbs.push({
 		id: randomId,
 		on_update: parsedExpression
 	});
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
				generate_js_callback(context, tree, ev, callback);
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

// TODO: JSDoc
var generate_innerjs = function generate_innerjs(js) {
	js = js.reverse();
	var result = "$(document).ready(function() {\n// --> Begin generated";

	js.forEach(function(block) {
		result += "\n" + block;
	});

	result += "\n// <-- End generated\n});"

	return result;
}

// TODO: JSDoc
var generate_reacivity = function generate_reacivity(context) {
	var result = {
		"type": "Program",
		"body": [
		{
			"type": "VariableDeclaration",
			"declarations": [
			{
				"type": "VariableDeclarator",
				"id": {
					"type": "Identifier",
					"name": "ractive"
				},
				"init": {
					"type": "NewExpression",
					"callee": {
						"type": "Identifier",
						"name": "Ractive"
					},
					"arguments": [
					{
						"type": "ObjectExpression",
						"properties": [
						{
							"type": "Property",
							"key": {
								"type": "Identifier",
								"name": "el"
							},
							"computed": false,
							"value": {
								"type": "Literal",
								"value": "#render-target",
								"raw": "'#render-target'"
							},
							"kind": "init",
							"method": false,
							"shorthand": false
						},
						{
							"type": "Property",
							"key": {
								"type": "Identifier",
								"name": "template"
							},
							"computed": false,
							"value": {
								"type": "Literal",
								"value": "#main-template",
								"raw": "'#main-template'"
							},
							"kind": "init",
							"method": false,
							"shorthand": false
						},
						{
							"type": "Property",
							"key": {
								"type": "Identifier",
								"name": "data"
							},
							"computed": false,
							"value": {
								"type": "ObjectExpression",
								"properties": [
								/*{
									"type": "Property",
									"key": {
										"type": "Identifier",
										"name": "name"
									},
									"computed": false,
									"value": {
										"type": "Literal",
										"value": "world",
										"raw": "'world'"
									},
									"kind": "init",
									"method": false,
									"shorthand": false
								}*/
								]
							},
							"kind": "init",
							"method": false,
							"shorthand": false
						}
						]
					}
					]
				}
			}
			],
			"kind": "var"
		}
		],
		"sourceType": "script"
	};

	var properties = result.body[0].declarations[0].init.arguments[0].properties[2].value.properties;

	var push_kv = function push_kv(key, value) {
		properties.push({
			"type": "Property",
			"key": {
				"type": "Identifier",
				"name": key
			},
			"computed": false,
			"value": value,
			"kind": "init",
			"method": false,
			"shorthand": false
		});
	};


	context.crumbs.forEach(function (crumb) {
		push_kv(crumb.id, {
			"type": "Identifier",
			"value": "undefined",
		});
	});

	return result;
};

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
			jquery.attributes.src = "js/jquery-2.2.1.min.js";
			tree.content.push(jquery);

			// Add Client RPC library
			var clientrpc = new Tag("script");
			clientrpc.attributes.src = "js/rpc.js";
			tree.content.push(clientrpc);

			// Add Ractive (Reactive library)
			var ractive = new Tag("script");
			ractive.attributes.src = "js/ractive-0.7.3.js";
			tree.content.push(ractive);

			// Add Watch.js
			var watchjs = new Tag("script");
			watchjs.attributes.src = "js/watch.js";
			tree.content.push(watchjs);

			// Add Varspy
			var varspy = new Tag("script");
			varspy.attributes.src = "js/varspy.js";
			tree.content.push(varspy);

			// Add generated Javascript
			var scripttag = new Tag("script");
			var innerJs = generate_innerjs(context.js);
			scripttag.content.push(innerJs + "\n");
			tree.content.push(scripttag);
		}

		if (tree.tagname === "body") {
			var temp = tree.content;
			tree.content = [];
			
			var render_target = new Tag("div");
			render_target.id = "render-target";
			tree.content.push(render_target);

			var main_template = new Tag("script");
			main_template.id = "main-template";
			main_template.attributes.type = "text/ractive";
			main_template.content = temp;
			tree.content.push(main_template);

			var reactivity = new Tag("script");
			reactivity.content.push("\n" + escodegen.generate(generate_reacivity(context)) + "\n");
			tree.content.push(reactivity);
		}
	});
 }

 exports.prepare = prepare;
 exports.applyContext = applyContext;
 exports.generate_innerjs = generate_innerjs