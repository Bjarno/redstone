/***********/
/* Imports */
/***********/

var Tag = require("./redstone-types.js").Tag;
var escodegen = require("escodegen");


/**********/
/* Fields */
/**********/

var context = {};


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
 * Generates the final clientside Javascript code, wrapped in a jQuery $(document).ready(...)
 * @private
 * @returns {String} The final client js code
 */
var generate_innerjs = function generate_innerjs() {
    var js = context.js.reverse();
    var result = "";

    // Open $(document).ready()
    result += "$(document).ready(function() {\n// --> Begin generated";

    js.forEach(function(block) {
        result += "\n" + block;
    });

    // "Link" methods by name
    context.functionNames.forEach(function(functionName) {
        result += "\nMETHODS[\"" + functionName + "\"] = " + functionName + ";";
    });

    // Add call to initialize GUI
    result += "\nREDSTONE.init();";

    // Close $(document).ready()
    result += "\n// <-- End generated\n});";

    return result;
};

/**
 * Generates esprima AST for the part of the code that starts the Ractivity container.
 * @private
 * @returns {Object} AST program containing the boot code for the Ractivity container.
 */
var generate_reactivity = function generate_reactivity() {
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
                                                "properties": []
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

    // Add all crumbs with a currently undefined value.
    context.crumbs.forEach(function (crumb) {
        push_kv(crumb.idName, {
            "type": "Identifier",
            "value": "undefined"
        });
    });

    return result;
};

/**
 * Creates a new object (mapping) containing all the crumb information, from a given crumbs array.
 * @param {Array} crumbs Array containing all crumbs.
 * @private
 * @returns {Object} Object containing mapping from idNames of crumbs to their on_update information
 */
var crumbs_to_mapping = function crumbs_to_mapping(crumbs) {
    var newobj = {};

    crumbs.forEach(function (crumb) {
        newobj[crumb.idName] = crumb;
    });

    return newobj;
};

/**
 * Creates a mapping from variable names to crumb identifiers
 * @param {Array} crumbs Array containing all crumbs.
 * @private
 * @returns {Object} Object containing mapping from variable names to crumb idNames.
 */
var crumbs_to_varnamemapping = function crumbs_to_varnamemapping(crumbs) {
    var newobj = {};

    crumbs.forEach(function (crumb) {
        var randomId = crumb.idName;
        crumb.variableNames.forEach(function (varname) {
            if (!newobj.hasOwnProperty(varname)) {
                newobj[varname] = [];
            }
            newobj[varname].push(randomId);
        });
    });

    return newobj;
};

/**
 * Generates Javascript code with information about the crumbs, stored in a CRUMBS variable.
 * @private
 * @returns {String} Javascript code so the client can read information about crumbs.
 */
var generate_crumbsjs = function generate_crumbsjs() {
    var result = "";
    result += "CRUMBS = " +  JSON.stringify(crumbs_to_mapping(context.crumbs)) + ";\n";
    result += "VARTOCRUMBID = " + JSON.stringify(crumbs_to_varnamemapping(context.crumbs)) + ";\n";
    result += "METHODS = {};\n"; // Added dynamically
    return result;
};

// TODO: JSDoc
var generate_head_content = function generate_head_content() {
    var result = [];

    // Add jQuery
    var jquery = new Tag("script");
    jquery.attributes.src = "js/jquery-2.2.1.min.js";
    result.push(jquery);

    // Add Client RPC library
    var clientrpc = new Tag("script");
    clientrpc.attributes.src = "js/rpc.js";
    result.push(clientrpc);

    // Add Ractive (Reactive library)
    var ractive = new Tag("script");
    ractive.attributes.src = "js/ractive-0.7.3.js";
    result.push(ractive);

    // Add Watch.js
    var watchjs = new Tag("script");
    watchjs.attributes.src = "js/watch.js";
    result.push(watchjs);

    // Add Objspy
    var objspy = new Tag("script");
    objspy.attributes.src = "js/objspy.js";
    result.push(objspy);

    // Add esprima syntax definitions
    var esprimaSyntax = new Tag("script");
    esprimaSyntax.attributes.src = "js/esprima-syntax.js";
    result.push(esprimaSyntax);

    // Add own function definitions (redstone.js);
    var redstoneJS = new Tag("script");
    redstoneJS.attributes.src = "js/redstone.js";
    result.push(redstoneJS);

    // Add crumb information
    var crumbs = new Tag("script");
    var crumbsJs = generate_crumbsjs();
    crumbs.content.push(crumbsJs + "\n");
    result.push(crumbs);

    // Add generated Javascript
    var scripttag = new Tag("script");
    var innerJs = generate_innerjs();
    scripttag.content.push(innerJs + "\n");
    result.push(scripttag);

    // Add CSS style (if supplied)
    if (context.css) {
        var css = new Tag("style");
        css.content.push(context.css);
        result.push(css);
    }

    return result;
};

// TODO: JSDoc
var applyHead = function applyHead(head) {
    var newTags = generate_head_content();

    newTags.forEach(function(t) {
         head.content.push(t);
    });
};

// TODO: JSDoc
var applyBody = function applyBody(body) {
    var temp = body.content;
    body.content = [];

    var render_target = new Tag("div");
    render_target.id = "render-target";
    body.content.push(render_target);

    var main_template = new Tag("script");
    main_template.id = "main-template";
    main_template.attributes.type = "text/ractive";
    main_template.content = temp;
    body.content.push(main_template);

    var reactivity = new Tag("script");
    reactivity.content.push("\n" + escodegen.generate(generate_reactivity()) + "\n");
    body.content.push(reactivity);
};

/**
 * Includes Javascript rules and external libraries into the HTML trees.
 * @param {Array} input Array of HTML trees.
 * @param {ConverterContext} newContext The context to use.
 */
var applyContext = function applyContext(input, newContext) {
    set_context(newContext);

    var seenHead = false;
    var seenBody = false;

    // Find specific elements in the tree
    input.forEach(function(tree) {
        switch (tree.tagname) {
            case "head":
                if (seenHead) {
                    throw "head already seen!";
                }
                seenHead = true;
                applyHead(tree);
                break;

            case "body":
                if (seenBody) {
                    throw "body already seen!";
                }
                seenBody = true;
                applyBody(tree);
                break;

            default:
                throw "Not allowing " + tree.tagname + " to be top-level.";
        }
    });

    // If head was not seen, add it
    if (!seenHead) {
        var newHead = new Tag("head");
        applyHead(newHead);
        input.push(newHead);
    }

    if (!seenBody) {
        var newBody = new Tag("body");
        applyBody(newBody);
        input.push(newBody);
    }
};


/***********/
/* Exports */
/***********/

exports.applyContext = applyContext;