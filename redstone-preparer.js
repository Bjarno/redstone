/***********/
/* Imports */
/***********/

var DynamicExpression  = require("./redstone-types.js").DynamicExpression;
var DynamicIfBlock     = require("./redstone-types.js").DynamicIfBlock;
var DynamicUnlessBlock = require("./redstone-types.js").DynamicUnlessBlock;
var DynamicEachBlock   = require("./redstone-types.js").DynamicEachBlock;
var DynamicWithBlock   = require("./redstone-types.js").DynamicWithBlock;
var Crumb              = require("./redstone-types.js").Crumb;
var Tag                = require("./redstone-types.js").Tag;
var ExposedValue       = require("./redstone-types.js").ExposedValue;

var randomstring = require("randomstring");
var esprima = require("esprima");
var escodegen = require("escodegen");


/**********/
/* Fields */
/**********/

var context = {};
var flag_in_with = false;


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
var set_in_with_flag = function set_in_with_flag(flag) {
    flag_in_with = flag;
};

/**
 * Returns the value of the flag that keeps track whether or not we are descending in an {{#each}} block.
 * @private
 * @returns {Boolean} Whether or not we are inside an {{#each block}}
 */
var is_in_with = function is_in_with() {
    return flag_in_with;
};

/**
 * Parses a MemberExpression to find the hierarchy of properties.
 * @param {MemberExpression} expression The expression to find the combination of the variable name (most-left) and the property hierarchy that is
 * requested from the MemberExpression.
 * @private
 * @returns {Array} Array containing variable top-level variables name of things inside a MemberExpression
 */
var parse_memberexpression_varname = function parse_memberexpression_varname(expression) {
    var result = [];

    switch (expression.type) {
        case esprima.Syntax.Identifier:
            expression.isInCrumb = true; // While evaluating, make sure we know this identifier name should be looked up locally
            result.push(expression.name);
            break;

        case esprima.Syntax.MemberExpression:
            // Get the next level
            if (expression.computed) {
                result = result.concat(find_varnames_expression(expression.property));
            }

            result = result.concat(parse_memberexpression_varname(expression.object));
            break;

        default:
            // throw "Only supports identifiers (or nested MemberExpressions) for MemberExpression's object.";
            // TODO: Show warning?

            result = result.concat(find_varnames_expression(expression));
            break;
    }

    return result;
};

/**
 * Recursively finds all the (top-level) variable names in the given expression
 * @param {Expression} expression The expression to look for variable names for.
 * @private
 * @returns {Array} List of variable names in this expression.
 */
var find_varnames_expression = function find_varnames_expression(expression) {
    var result = [];

    switch (expression.type) {
        case esprima.Syntax.Literal:
            break;

        case esprima.Syntax.Identifier:
            expression.isInCrumb = true; // While evaluating, make sure we know this identifier name should be looked up locally
            result.push(expression.name);
            break;

        case esprima.Syntax.MemberExpression:
            result = result.concat(parse_memberexpression_varname(expression));
            break;

        case esprima.Syntax.BinaryExpression:
            result = result.concat(find_varnames_expression(expression.left));
            result = result.concat(find_varnames_expression(expression.right));
            break;

        case esprima.Syntax.CallExpression:
            var calleeExpression = expression.callee;
            var arguments = expression.arguments;

            console.log("!!!!!");
            console.log(calleeExpression.type);

            switch (calleeExpression.type) {
                case esprima.Syntax.Identifier:
                    context.functionNames.push(calleeExpression.name);
                    break;

                case esprima.Syntax.MemberExpression:
                    result = result.concat(parse_memberexpression_varname(calleeExpression));
                    break;
            }

            arguments.forEach(function (argument) {
                result = result.concat(find_varnames_expression(argument));
            });
            break;

        case esprima.Syntax.ConditionalExpression:
            result = result.concat(find_varnames_expression(expression.test));
            result = result.concat(find_varnames_expression(expression.consequent));
            result = result.concat(find_varnames_expression(expression.alternate));
            break;

        default:
            throw "Unknown ExpressionStatement type '" + expression.type + "'.";
    }

    return result;
};

/**
 * Parses an AST tree of a dynamic expression, and outputs the type, and information about the arguments (variable
 * names) if it is a method call, or how to treat the object (simple identifier, or a member expression).
 * @param {Object} AST The AST tree of a dynamic expression.
 * @private
 * @returns {Array} Object with the type of the expression (key: type), and depending on the type, more information
 * about the variable names of the arguments if it is a method call.
 */
var parse_ast_varnames = function parse_ast_varnames(AST) {
    if (AST.type !== esprima.Syntax.Program) {
        throw "AST should start with Program";
    }

    var body = AST.body;
    if (body.length != 1) {
        throw "Literal expression should only have one expression.";
    }

    var statement = body[0];
    if (statement.type !== esprima.Syntax.ExpressionStatement) {
        throw "The inner contents of an dynamic expression should be an expression.";
    }

    return find_varnames_expression(statement.expression);
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
 * @param {Tag} tag The tag that should be used to link the callback to the event.
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
    var js = "$(\"#" + id + "\")." + ev + "(REDSTONE.createCallback(" + callback + "));";
    context.js.push(js);
};

/**
 * Generates a random identifier for a dynamic (reactive) block/segment.
 * @private
 * @returns {String} A random string
 */
var generate_randomRId = function generate_randomRId() {
    var r;

    // Keep creating random idNames, until it is unique
    do {
        r = "r" + randomstring.generate(context.options.random_length);
    } while (context.idNames.indexOf(r) !== -1);

    // Let context know about this new idName
    context.idNames.push(r);

    return r;
};

/**
 * Prepares a dynamic expression.
 * @param {DynamicExpression} dynamic The segment to prepare code for.
 * @private
 */
var prepare_dynamic_expression = function prepare_dynamic_expression(dynamic) {
    var expression = dynamic.expression;

    // Don't do anything if it is an invisible HTML comment
    if (expression.indexOf("- ") === 0) {
        dynamic.isComment = true;
        dynamic.isHiddenComment = false;
        dynamic.expression = expression.substring(2);
        return;
    }

    // Don't do anything if it is a visible HTML comment
    if (expression.indexOf("/ ") === 0) {
        dynamic.isComment = true;
        dynamic.isHiddenComment = true;
        dynamic.expression = expression.substring(2);
        return;
    }

    // Only do something when not in {{#each}}
    if (is_in_with()) {
        return;
    }

    // Prefix with r, as first character can be a number, and r = reactivity.
    var randomId = generate_randomRId();

    var AST = esprima.parse(expression);
    var variableNames = parse_ast_varnames(AST);

    var crumb = new Crumb(randomId, variableNames, AST);
    context.crumbs.push(crumb);
    dynamic.crumb = crumb;

};

/**
 * Prepares a dynamic if block.
 * @param {DynamicIfBlock} dynamic The block to prepare
 * @private
 */
var prepare_dynamic_if_block = function prepare_dynamic_if_block(dynamic) {
    var randomId = generate_randomRId();
    var parsedPredicateExpression = esprima.parse(dynamic.predicateExpression);
    var true_branch = dynamic.true_branch;
    var false_branch = dynamic.false_branch;

    true_branch.forEach(function (expression) {
        prepare(expression);
    });

    false_branch.forEach(function (expression) {
        prepare(expression);
    });

    var varNames = parse_ast_varnames(parsedPredicateExpression);
    var crumb = new Crumb(randomId, varNames, parsedPredicateExpression);

    context.crumbs.push(crumb);
    dynamic.crumb = crumb;
};

/**
 * Prepares a dynamic unless block.
 * @param {DynamicUnlessBlock} dynamic The block to prepare
 * @private
 */
var prepare_dynamic_unless_block = function prepare_dynamic_unless_block(dynamic) {
    var randomId = generate_randomRId();
    var parsedPredicateExpression = esprima.parse(dynamic.predicateExpression);
    var true_branch = dynamic.true_branch;

    true_branch.forEach(function (expression) {
        prepare(expression);
    });

    var varNames = parse_ast_varnames(parsedPredicateExpression);
    var crumb = new Crumb(randomId, varNames, parsedPredicateExpression);

    context.crumbs.push(crumb);
    dynamic.crumb = crumb;
};

/**
 * Prepares a dynamic each or with block.
 * @param {DynamicEachBlock|DynamicWithBlock} dynamic The block to prepare
 * @private
 */
var prepare_dynamic_eachwith_block = function prepare_dynamic_eachwith_block(dynamic) {
    var randomId = generate_randomRId();
    var parsedObjectExpression = esprima.parse(dynamic.objectExpression);
    var body = dynamic.body;

    // Set/unset flag, so dynamic expressions are not parsed and taken for granted
    var old_in_each_flag = is_in_with();
    set_in_with_flag(true);
    body.forEach(function (a) {
        prepare(a);
    });
    set_in_with_flag(old_in_each_flag);

    var variableNames = parse_ast_varnames(parsedObjectExpression);
    var crumb = new Crumb(randomId, variableNames, parsedObjectExpression);

    context.crumbs.push(crumb);
    dynamic.crumb = crumb;
};

/**
 * Prepares a dynamic each block.
 * @param {DynamicEachBlock} dynamic The block to prepare
 * @private
 */
var prepare_dynamic_each_block = prepare_dynamic_eachwith_block;

/**
 * Prepares a dynamic with block.
 * @param {DynamicWithBlock} dynamic The block to prepare
 * @private
 */
var prepare_dynamic_with_block = prepare_dynamic_eachwith_block;

/**
 * Prepares a dynamic block.
 * @param {DynamicIfBlock|DynamicEachBlock|DynamicWithBlock|DynamicUnlessBlock} dynamic The block to prepare
 * @private
 */
var prepare_dynamic_block = function prepare_dynamic_block(dynamic) {
    var type = dynamic.type;

    switch (type) {
        case "if":
            prepare_dynamic_if_block(dynamic);
            break;
        
        case "unless":
            prepare_dynamic_unless_block(dynamic);
            break;

        case "each":
            prepare_dynamic_each_block(dynamic);
            break;
        
        case "with":
            prepare_dynamic_with_block(dynamic);
            break;
    }
};

/**
 * Checks whether the given attribute value is an exposed value/variable
 * @param value The attribute value to check
 * @returns {boolean} true if it is an exposed value/variable, false otherwise
 */
var is_exposed_value = function is_exposed_value(value) {
    return ( (value.indexOf("{{") === 0) && (value.indexOf("}}") === value.length - 2) );
};

/**
 * Returns the expression name of the exposed value, from an attribute value
 * @param value The attribute value
 * @returns {String} The expression of an exposed value
 */
var get_exposed_value_expression = function get_exposed_value_expression(value) {
    return value.substring(2, value.length - 2).trim();
};

/**
 * Parses an exposed value/variable attribute definition
 * @param {Tag} tag The tag
 * @param {String} name The name of the attribute
 * @param {String} value The value of the attribute
 * @private
 * @returns {ExposedValue} The exposed value generated
 */
var parse_exposed_value = function parse_exposed_value(tag, name, value) {
    var randomId = generate_randomRId();
    var parsedExpression = esprima.parse(get_exposed_value_expression(value));
    var variableNames = parse_ast_varnames(parsedExpression);
    var exposedValue = new ExposedValue(randomId, variableNames, parsedExpression);
    tag.attributes[name] = exposedValue;
    
    context.exposedValues.push(exposedValue);
    return exposedValue;
};

/**
 * Prepares a dynamic tag.
 * @param {Tag} tag The tag to prepare
 * @private
 */
var prepare_tag = function prepare_tag(tag) {
    // Install callbacks
    var attributes = tag.attributes;
    for (var name in attributes) {
        if (attributes.hasOwnProperty(name)) {
            if (name[0] == "@") {
                var ev = name.substring(1, name.length);
                var callback = attributes[name];
                generate_js_callback(tag, ev, callback);
            }
        }
    }

    // Check if it contains an exposed value
    for (var name in attributes) {
        if (attributes.hasOwnProperty(name)) {
            var value = attributes[name];
            if (is_exposed_value(value)) {
                parse_exposed_value(tag, name, value);
            }
        }
    }

    // Loop over content of the tree.
    tag.content.forEach(function(subtree) {
        prepare(subtree);
    });
};

/**
 * Returns whether the given object is a dynamic expression
 * @param {Object} obj The object to check
 * @private
 * @returns boolean true when the given object is a dynamic expression, false otherwise
 */
var is_dynamicExpression = function is_dynamicExpression(obj) {
    return (obj instanceof DynamicExpression);
};

/**
 * Returns whether the given object is a dynamic block
 * @param {Object} obj The object to check
 * @private
 * @returns boolean true when the given object is a dynamic block, false otherwise
 */
var is_dynamicBlock = function is_dynamicBlock(obj) {
    return ( (obj instanceof DynamicEachBlock)   ||
             (obj instanceof DynamicIfBlock)     ||
             (obj instanceof DynamicUnlessBlock) ||
             (obj instanceof DynamicWithBlock)
    );
};

/**
 * Returns whether the given object is a normal (HTML) tag
 * @param {Object} obj The object to check
 * @private
 * @returns boolean true when the given object is a tag, false otherwise
 */

var is_tag = function is_tag(obj) {
    return (obj instanceof Tag);
};

/**
 * Prepares a tree, looking for dynamic segments and callback installers.
 * @param {Tag|String|Boolean|undefined|DynamicExpression|DynamicIfBlock|DynamicEachBlock} obj The object to prepare.
 * @private
 */
var prepare = function prepare_tree(obj) {
    var jstype = typeof obj;

    if ( (jstype == "string") || (jstype == "boolean") || (jstype == "undefined") ) {
        return;
    }

    if (is_dynamicExpression(obj)) {
        return prepare_dynamic_expression(obj);
    }

    if (is_dynamicBlock(obj)) {
        return prepare_dynamic_block(obj);
    }

    if (is_tag(obj)) {
        return prepare_tag(obj);
    }

    throw "Unknown type of \"tree\":" + obj;
};

/**
 * Generates crumbs for dynamic content, and generates Javascript for installing callbacks.
 * @param {Array} input Array of HTML trees.
 * @param {ConverterContext} newcontext The context to use.
 */
var prepare_array = function prepare_array(input, newcontext) {
    set_context(newcontext);

    input.forEach(function(tree) {
        prepare(tree);
    });
};


/***********/
/* Exports */
/***********/

exports.prepare = prepare_array;