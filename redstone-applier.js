var Tag = require("./redstone-types.js").Tag;

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
var generate_reactivity = function generate_reactivity(context) {
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


    context.crumbs.forEach(function (crumb) {
        push_kv(crumb.id, {
            "type": "Identifier",
            "value": "undefined",
        });
    });

    return result;
};

// TODO: JSDoc
var optimize_crumbs = function optimize_crumbs(crumbs) {
    var newobj = {};

    crumbs.forEach(function (crumb) {
        newobj[crumb.id] = crumb.on_update;
        delete crumb.on_update.graph;
    });

    return newobj;
}

// TODO: JSDoc
var generate_crumbsjs = function generate_crumbsjs(crumbs) {
    crumbs = optimize_crumbs(crumbs);
    var result = "";
    result += "CRUMBS = " + JSON.stringify(crumbs) + ";";
    return result;
}

/**
 * Includes Javascript rules and external libraries into the HTML trees.
 * @param {Array} input Array of HTML trees.
 * @param {ConverterContext} context The context to use.
 */
 var applyContext = function applyContext(input, context) {
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
            var crumbsJs = generate_crumbsjs(context.crumbs);
            crumbs.content.push(crumbsJs + "\n");
            tree.content.push(crumbs);

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
            reactivity.content.push("\n" + escodegen.generate(generate_reactivity(context)) + "\n");
            tree.content.push(reactivity);
        }
    });
}

exports.applyContext = applyContext;