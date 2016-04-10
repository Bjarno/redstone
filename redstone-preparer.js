/***********/
/* Imports */
/***********/

var DynamicExpression = require("./redstone-types.js").DynamicExpression;
var DynamicBlock      = require("./redstone-types.js").DynamicBlock;

var randomstring = require("randomstring");
var esprima = require("esprima");
var escodegen = require("escodegen");


/**********/
/* Fields */
/**********/

var context = {};
var flag_in_each = false;


/***************/
/* Definitions */
/***************/

/**
 * Sets the context to use to get information from.
 * @param {ConverterContext} newContext The context to use
 * @private
 */
var set_context = function set_context(newContext) {
    context = newContext;
};

/**
 * Sets the flag the preparer is currently descending or not in an {{#each}} block.
 * @param {Boolean} flag The value of the flag.
 * @private
 */
var set_in_each_flag = function set_in_each_flag(flag) {
    flag_in_each = flag;
};

/**
 * Returns the value of the flag that keeps track whether or not we are descending in an {{#each}} block.
 * @private
 * @returns {Boolean} Whether or not we are inside an {{#each block}}
 */
var is_in_each = function is_in_each() {
    return flag_in_each;
};

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
 * @param {Object} argument The argument of a function to find variable names in.
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

    return result.filter(function (item, pos, self) {
        return self.indexOf(item) == pos;
    });
};

/**
 * Parses a MemberExpression to find the hierarchy of properties.
 * @param {MemberExpression} expression The expression to find the combination of the variable name (most-left) and the property hierarchy that is
 * requested from the MemberExpression.
 * @private
 * @returns {Object} containing the variable name (key: varname) and the ordered hierarchy of accessed properties (key: properties)
 */
var parse_memberexpression = function parse_memberexpression(expression) {
    switch (expression.type) {
        case esprima.Syntax.Identifier:
            var varname = expression.name;
            return {
                varname: varname,
                properties: []
            };

        case esprima.Syntax.MemberExpression:
            var property = expression.property;
            var object = expression.object;

            // Check type of property (only allow identifiers)
            if (property.type !== esprima.Syntax.Identifier) {
                throw "Only supports identifiers for MemberExpression's property.";
            }

            // Get the next level, and append/push this property at the end
            var a = parse_memberexpression(object);
            a.properties.push(property.name);
            return a;

        default:
            throw "Only supports identifiers (or nested MemberExpressions) for MemberExpression's object.";
    }
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
            return {
                "type": "Identifier",
                "varname": expression.name
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
var get_id = function get_id(tag) {
    var id = tag.id;
    if (typeof id === "string") {
        return id;
    }

    var len = context.options.random_length;
    id = randomstring.generate(len);
    tag.id = id;
    return id;
};

/**
 * Generates Javascript code to install an event listener.
 * @param {Tag} tag The tag that should be used to link the callback to the
 * event.
 * @param {String} ev The event to use. Assumes $(...).<event> exists.
 * @param {String} callback Name of the global callback function.
 * @private
 */
var generate_js_callback = function generate_js_callback(tag, ev, callback) {
    if (tag.tagname === "html") {
        throw "NYI";
    }

    context.callbacks.push(callback); // Makes sure that Stip knows it is called on client-side

    var id = get_id(tag);
    var js = "$(\"#" + id + "\")." + ev + "(" + callback + ");";
    context.js.push(js);
};

/**
 * Generates a random identifier for a dynamic (reactive) block/segment.
 * @private
 * @returns {String} A random string
 */
var generate_randomRId = function generate_randomRId() {
    return "r" + randomstring.generate(context.options.random_length);
};

/**
 * Prepares a dynamic expression.
 * @param {DynamicExpression} dynamic The segment to prepare code for.
 * @private
 */
var prepare_dynamic_expression = function prepare_dynamic_expression(dynamic) {
    // Only do something when not in {{#each}}

    if (!is_in_each()) {
        // Prefix with r, as first character can be a number, and r = reactivity.
        var randomId = generate_randomRId();
        var expression = dynamic.expression;
        var AST = esprima.parse(expression);
        var parsedExpression = parse_ast(AST);

        dynamic.idName = randomId;

        context.crumbs.push({
            id: randomId,
            on_update: parsedExpression
        });
    }
};

/**
 * Prepares a dynamic block.
 * @param {DynamicBlock} dynamic The block to prepare
 * @private
 */
var prepare_dynamic_block = function prepare_dynamic_block(dynamic) {
    var type = dynamic.type;
    var randomId = generate_randomRId();
    dynamic.idName = randomId;

    var parsedExpression, crumb;

    switch (type) {
        case "if":
            var predicate = esprima.parse(dynamic.predicate);
            var true_branch = dynamic.true_branch;
            var false_branch = dynamic.false_branch;

            true_branch.forEach(function (expression) {
                prepare_tree(expression);
            });

            false_branch.forEach(function (expression) {
                prepare_tree(expression);
            });

            parsedExpression = parse_ast(predicate);
            crumb = {
                id: randomId,
                on_update: parsedExpression
            };

            context.crumbs.push(crumb);

            dynamic.crumb = crumb;
            break;

        case "each":
            var obj_expr = esprima.parse(dynamic.object);
            var body = dynamic.body;

            var old_in_each = is_in_each();
            set_in_each_flag(true);
            body.forEach(function (a) {
                prepare_tree(a);
            });
            set_in_each_flag(old_in_each);

            parsedExpression = parse_ast(obj_expr);
            crumb = {
                id: randomId,
                on_update: parsedExpression
            };

            context.crumbs.push(crumb);
            dynamic.crumb = crumb;

    }
};

/**
 * Prepares a tree, looking for dynamic segments and callback installers.
 * @param {Tag} tree The tree to handle.
 * @private
 */
var prepare_tree = function prepare_tree(tree) {
    var jstype = typeof tree;

    if ( (jstype == "string") || (jstype == "boolean") || (jstype == "undefined") ) {
        return;
    }

    if (tree instanceof DynamicExpression) {
        return prepare_dynamic_expression(tree);
    }

    if (tree instanceof DynamicBlock) {
        return prepare_dynamic_block(tree);
    }

    // Install callbacks
    var attributes = tree.attributes;
    for (var name in attributes) {
        if (attributes.hasOwnProperty(name)) {
            if (name[0] == "@") {
                var ev = name.substring(1, name.length);
                var callback = attributes[name];
                generate_js_callback(tree, ev, callback);
            }
        }
    }

    // Loop over content of the tree.
    tree.content.forEach(function(subtree) {
        prepare_tree(subtree);
    });
};

/**
 * Generates crumbs for dynamic content, and generates
 * Javascript for installing callbacks.
 * @param {Array} input Array of HTML trees.
 * @param {ConverterContext} newcontext The context to use.
 */
var prepare = function prepare(input, newcontext) {
    set_context(newcontext);

    input.forEach(function(tree) {
        prepare_tree(tree);
    });
};


/***********/
/* Exports */
/***********/

exports.prepare = prepare;