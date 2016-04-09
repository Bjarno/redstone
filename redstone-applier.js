/***********/
/* Imports */
/***********/

var Tag = require("./redstone-types.js").Tag;


/**********/
/* Fields */
/**********/

var context = {};


/***************/
/* Definitions */
/***************/

/**
 * Sets the context to use to get information from.
 * @param {ConvertorContext} newcontext The context to use
 * @private
 */
var set_context = function set_context(newcontext) {
    context = newcontext;
}

/**
 * Generates the final clientside Javascript code, wrapped in a jQuery $(document).ready(...)
 * @private
 * @returns The final client js code
 */
var generate_innerjs = function generate_innerjs() {
    var js = context.js.reverse();
    var result = "$(document).ready(function() {\n// --> Begin generated";

    js.forEach(function(block) {
        result += "\n" + block;
    });

    result += "\n// <-- End generated\n});"

    return result;
}

/**
 * Generates esprima AST for the part of the code that starts the Ractivity container.
 * @private
 * @returns {Program} AST program containing the boot code for the Ractivity container.
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
        push_kv(crumb.id, {
            "type": "Identifier",
            "value": "undefined",
        });
    });

    return result;
};

/**
 * Creates a new object containing all the crumb information, from a given crumbs array.
 * This method also removes graph information from the original
 * @param {Array} crumbs Array containing all crumbs.
 * @private
 * @returns {Object} Object containing mapping from idNames of crumbs to their on_update information
 */
var optimize_crumbs = function optimize_crumbs(crumbs) {
    var newobj = {};

    crumbs.forEach(function (crumb) {
        newobj[crumb.id] = crumb.on_update;
        delete crumb.on_update.graph;
    });

    return newobj;
}

/**
 * Generates Javascript code with information about the crumbs, stored in a CRUMBS variable.
 * @private
 * @returns Javascript code so the client can read information about crumbs.
 */
var generate_crumbsjs = function generate_crumbsjs() {
    var crumbs = optimize_crumbs(context.crumbs);
    var result = "";
    result += "CRUMBS = " + JSON.stringify(crumbs) + ";";
    return result;
}

/**
 * Includes Javascript rules and external libraries into the HTML trees.
 * @param {Array} input Array of HTML trees.
 * @param {ConverterContext} newcontext The context to use.
 */
 var applyContext = function applyContext(input, newcontext) {
    set_context(newcontext);

    // Find specific elements in the tree
    input.forEach(function(tree) {
        // Add elements to head tag
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

            // Add Objspy
            var objspy = new Tag("script");
            objspy.attributes.src = "js/objspy.js";
            tree.content.push(objspy);

            // Add own function definitions (redstone.js);
            var redstoneJS = new Tag("script");
            redstoneJS.attributes.src = "js/redstone.js";
            tree.content.push(redstoneJS);

            // Add crumb information
            var crumbs = new Tag("script");
            var crumbsJs = generate_crumbsjs();
            crumbs.content.push(crumbsJs + "\n");
            tree.content.push(crumbs);

            // Add generated Javascript
            var scripttag = new Tag("script");
            var innerJs = generate_innerjs();
            scripttag.content.push(innerJs + "\n");
            tree.content.push(scripttag);

            // Add CSS style (if supplied)
            if (context.css) {
                var css = new Tag("style");
                css.content.push(context.css);
                tree.content.push(css);
            }
        }

        // Change the inner tags of the body, so they are inside a Ractive container (called render-target).
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
            reactivity.content.push("\n" + escodegen.generate(generate_reactivity(context)) + "\n");
            tree.content.push(reactivity);
        }
    });
}


/***********/
/* Exports */
/***********/

exports.applyContext = applyContext;