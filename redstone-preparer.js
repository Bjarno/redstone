var Tag               = require("./redstone-types.js").Tag;
var DynamicExpression = require("./redstone-types.js").DynamicExpression;
var DynamicBlock      = require("./redstone-types.js").DynamicBlock;

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

 // TODO: JSDoc
 var parse_memberexpression = function parse_memberexpression(expression) {
    switch (expression.type) {
        case esprima.Syntax.Identifier:
        var varname = expression.name;
        return {
            varname: varname,
            properties: []
        }
        break;

        case esprima.Syntax.MemberExpression:
        var property = expression.property;
        var object = expression.object;

            // Check type of property (only allow identifiers)
            if (property.type !== esprima.Syntax.Identifier) {
                throw "Only supports identifiers for MemberExpression's property.";
            }

            var a = parse_memberexpression(object);
            a.properties.push(property.name);
            return a;

            break;

            default:
            throw "Only supports identifiers (or nested MemberExpressions) for MemberExpression's object.";
        }
    }

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

            case esprima.Syntax.MemberExpression:
            if (expression.computed) {
                throw "Unknown what to do when value is computed.";
            }

            var a          = parse_memberexpression(expression),
            varname    = a.varname,
            properties = a.properties;

            return {
                "type": "MemberExpression",
                "properties": properties,
                "varname": varname
            };

            default:
            throw "Unsupported type of Expression '" + expression.type + "'.";
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

// TODO: JSDoc
var generate_randomrid = function generate_randomrid(context) {
    return "r" + randomstring.generate(context.random_length);
}

/**
 * Prepares a dynamic expression.
 * @param {ConverterContext} context The context to use.
 * @param {DynamicExpression} dynamic The segment to generate code for.
 * @private
 */
 var prepare_dynamic_expression = function prepare_dynamic_expression(context, dynamic) {
    // Prefix with r, as first character can be a number, and r = reactivity.
    var randomId = generate_randomrid(context);
    var expression = dynamic.expression;
    var AST = esprima.parse(expression);
    var parsedExpression = parse_ast(AST);

    dynamic.idName = randomId;

    context.crumbs.push({
        id: randomId,
        on_update: parsedExpression
    });
};

// TODO: JSDoc
var prepare_dynamic_block = function prepare_dynamic_block(context, dynamic) {
    var type = dynamic.type;
    var randomId = generate_randomrid(context);
    dynamic.idName = randomId;

    switch (type) {
        case "if":
            var predicate = esprima.parse(dynamic.predicate);
            var true_branch = dynamic.true_branch;
            var false_branch = dynamic.false_branch;

            true_branch.forEach(function (expression) {
                prepare_tree(expression, context);
            });

            false_branch.forEach(function (expression) {
                prepare_tree(expression, context);
            });

            var parsedExpression = parse_ast(predicate);
            var crumb = {
                id: randomId,
                on_update: parsedExpression
            };

            context.crumbs.push(crumb);

            dynamic.crumb = crumb;
            break;

        case "each":
            throw "NYI";

    }
}

/**
 * Prepares a tree, looking for dynamic segments and callback installers.
 * @param {Tag} tree The tree to handle.
 * @param {ConverterContext} context The context to use.
 * @private
 */
 var prepare_tree = function prepare_tree(tree, context) {
    var jstype = typeof tree;

    if ( (jstype == "string") || (jstype == "boolean") || (jstype == "undefined") ) {
        return;
    }
    
    if (tree instanceof DynamicExpression) {
        return prepare_dynamic_expression(context, tree);
    }

    if (tree instanceof DynamicBlock) {
        return prepare_dynamic_block(context, tree);
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

exports.prepare = prepare;