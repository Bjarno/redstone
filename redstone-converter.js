var DynamicSegment = require("./redstone-types.js").DynamicSegment;
var ConverterContext = require("./redstone-types.js").ConverterContext;

var randomstring = require("randomstring");
var esprima = require("esprima");

/**
 * Creates a string for identation.
 * @param {Number} ident The indentation level.
 * @param {String} str The string to use for identation (default: "\t")
 * @private
 */
var create_indent = function create_indent(indent, str) {
	if (str === undefined) {
		str = "\t";
	}
	return str.repeat(indent);
};

/**
 * Generates a string for the doctype of the document.
 * @param {ConverterContext} context The context to use.
 * @param {Tag} tag The tag containing information about the doctype.
 * @param {Number} indent The indentation level to use, to generate the
 * doctype.
 * @private
 * @returns HTML for the doctype.
 */
var generate_doctype = function generate_doctype(context, tag, indent) {
	var content = tag.content;
	if (content.length === 0) {
		content[0] = "html5";
	}
	if (content.length === 1) {
		var type = content[0];
		switch (type) {
			case "html5":
				var html = create_indent(indent) + "<!DOCTYPE html>";
				return html;

			default:
				throw "unknown doctype";
		}
	} else {
		throw "doctype doesn't expect more then 1 content segment";
	}
};

/**
 * Generates HTML for all elements inside another element.
 * @param {ConverterContext} context The context to use.
 * @param {Array} content The contents of a higher tag.
 * @param {Number} indent The indentation level to use.
 */
var generate_innerHTML = function generate_innerHTML(context, content, indent) {
	if (content.length > 0) {
		var first = content[0];
		// If onlye size 1, and type is text: do not use newlines.
		if ( (content.length == 1) && (typeof first == "string") ) {
			return first;
		} else {
			var innerHTML = content.map(function (sub) {
				return generate_tree(context, sub, indent + 1);
			}).join("\n");

			return "\n" + innerHTML + "\n" + create_indent(indent);
		}
	}
	return "";
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
 * Generate soras definitions for HTML.
 * @param {ConverterContext} context The context to use.
 * @param {Tag} tag The tag to get id, classes and attributes for.
 * @returns {String} String containing the soras definitions in HTML.
 */
var generate_soras = function generate_soras(context, tag) {
	var resultHTML = "";

	// Add attributes
	var attributes = tag.attributes;
	for (var name in attributes) {
		if (attributes.hasOwnProperty(name)) {
			if (name[0] == "@") {
				var ev = name.substring(1, name.length);
				var callback = attributes[name];
				var js = generate_js_event(context, tag, ev, callback);
				context.js.push(js);
			} else {
				// Assume it to be a normal HTML attribute.
				resultHTML += " " + name + "=\"" + attributes[name] + "\"";
			}
		}
	}

	// Add classes
	var classes = tag.classes;
	if (classes.length > 0) {
		resultHTML += " class=\"" + classes.join(" ") + "\"";
	}

	// Add id
	var id = tag.id;
	if (typeof id === "string") {
		resultHTML += " id=\"" + id + "\"";
	}

	return resultHTML;
};

/**
 * Generate the opening tag, including the soras definitions.
 * @param {ConverterContext} context The context to use.
 * @param {Tag} tag The tag to get id, classes and attributes for.
 * @param {Boolean} selfclosing Wether this tag is a self-closing tag.
 * @returns {String} String containing the opening tag for the given tag.
 */
var generate_opentag = function generate_opentag(context, tag, selfclosing) {
	var tagname = tag.tagname;

	var resultHTML = "<" + tagname + generate_soras(context, tag);
	if ( (selfclosing === true) && (context.options.selfclosing_backslash) ) {
		resultHTML += " /";
	}
	resultHTML += ">";

	return resultHTML;
};

/**
 * Generate the closing tag.
 * @param {Tag} tag The tag to get id, classes and attributes for.
 * @returns {String} String containing the closing tag for the given tag.
 */
var generate_closetag = function generate_closetag(tag) {
	var tagname = tag.tagname;

	return "</" + tagname + ">";
};

/**
 * Preprocesses a tag by changing some values, if none are given, by their
 * default values, or by taking the content, and using it as an attribute.
 * @param {Tag} tag The tag to preprocess.
 * @private
 */
var preprocess_tag = function preprocess_tag(tag) {
	var tagname = tag.tagname;

	switch (tagname) {
		case "img":
		case "iframe":
			if (tag.content.length == 1) {
				if (tag.attributes.hasOwnProperty("src")) {
					throw "src attribute already given";
				}
				tag.attributes.src = tag.content[0];
			}
			break;
	}
};

/**
 * Generates HTML for a generic tag name, with an innerHTML and no limitations
 * on classes, ids or attributes.
 * @param {ConverterContext} context The context to use.
 * @param {Tag} tag The tag to generate HTML code for.
 * @param {Number} indent The indentation level to use.
 * @private
 * @returns HTML for the given tag.
 */
var generate_generic = function generate_generic(context, tag, indent) {
	preprocess_tag(tag);

	var content = tag.content;
	var resultHTML = create_indent(indent);

	// Generate opening tag
	resultHTML += generate_opentag(context, tag);

	// Add innerHTML
	resultHTML += generate_innerHTML(context, content, indent);

	// Generate closing tag
	resultHTML += generate_closetag(tag);

	return resultHTML;
};

/**
 * Generates HTML for a generic tag name, without any innerHTML and no
 * limitations on classes, ids or attributes. E.g. br, img...
 * @param {ConverterContext} context The context to use.
 * @param {Tag} tag The tag to generate HTML code for.
 * @param {Number} indent The indentation level to use.
 * @private
 * @returns HTML for the given tag.
 */
var generate_selfclosing = function generate_selfclosing(context, tag, indent) {
	preprocess_tag(tag);

	var resultHTML = create_indent(indent);

	resultHTML += generate_opentag(context, tag, true);
	return resultHTML;
};

// TODO: JSDoc
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
			throw "Unknown ExpressionStatement type.";
	}
};

// TODO: JSDoc
var find_varnames_argument = function find_varnames_argument(argument) {
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

// TODO: JSDoc
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

// TODO: JSDoc
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
		throw "The inner contents of a literal expression should be, as the name applies, an expression.";
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

};

// TODO: JSDoc
var install_crumbs_call = function install_crumbs_call(id, parsed) {

};

// TODO: JSDoc
var install_crumbs_membercall = function install_crumbs_membercall(id, parsed) {

};

// TODO: JSDoc
var install_crumbs_memberexpr = function install_crumbs_memberexpr(id, parsed) {

};

// TODO: JSDoc
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
 * Generates HTML for a dynamic segment.
 * @param {DynamicSegment} dynamic The segment to generate code for.
 * @param {Number} indent The indentation level to use.
 * @private
 * @returns HTML for the given tag.
 */
var generate_dynamic = function generate_dynamic(context, dynamic, indent) {
	var randomid = randomstring.generate(context.random_length);
	var expression = dynamic.expression;
	var AST = esprima.parse(expression);
	var parsed_expression = parse_ast(AST);
	
	return "";
	// TODO: Finish procedure, depending on parse_ast

	// Generate HTML and "install" breadcrumbs in context, depending on type

	// Note:
	// Args can only be identifiers, literals or combination using BinaryExpressions
	var func = dispatch_install_crumbs(parsed_expression.type);
	func(randomid, parsed_expression);

	/*
	var dynamics = context.dynamics;
	// Create new entry if first occurance of varname
	if (!(dynamics.hasOwnProperty(varname))) {
		dynamics[varname] = [];
	}
	dynamics[varname].push(randomid);

	var html = create_indent(indent) + "<span id=\"" + randomid + "\">";
	html += "<!-- {{" + varname + "}} --></span>";
	return html;
	*/
};

/**
 * Returns the correct generator, given a tagname.
 * @param {String} tagname The tagname to find a generator for.
 * @private
 */
var find_generator = function find_generator(tagname) {
	switch (tagname) {
		case "doctype":
			return generate_doctype;
		case "img":
		case "br":
		case "hr":
		case "input":
		case "link":
		case "embed":
		case "meta":
			return generate_selfclosing
		;
		default:
			return generate_generic;
	}
};


/**
 * Generates for a given tree (Tag).
 * @param {Tag} The root of the tree.
 * @param {Number} indent The indentation level to use.
 * @private
 * @returns HTML for the entire tree.
 */
var generate_tree = function generate_tree(context, tree, indent) {
	if (typeof tree == "string") {
		return create_indent(indent) + tree;
	}
	if (tree instanceof DynamicSegment) {
		return generate_dynamic(context, tree, indent);
	}
	var tag = tree;
	var tagname = tag.tagname;
	var generator = find_generator(tagname);
	return generator(context, tag, indent);
};

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

/**
 * Generates for a given tree or list (array) of trees.
 * @param {Tag|Array} input The elements to generate HTML code for.
 * @returns HTML code for the given tree.
 */
var generate = function generate(input, options) {
	options = preprocess_options(options);
	var context = new ConverterContext([], {}, options);

	var html = "";

	if (Array.isArray(input)) {
		html = input.map(function (tree) {
			return generate_tree(context, tree, 0);
		}).join("\n");
	} else {
		// Assume it to be a tree of Tags...
		html = generate_tree(context, input, 0);
		return ;
	}

	return {"html": html, "meta": context};
};

exports.generate = generate;