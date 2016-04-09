/***********/
/* Imports */
/***********/

var DynamicExpression = require("./redstone-types.js").DynamicExpression;
var DynamicBlock      = require("./redstone-types.js").DynamicBlock;

var randomstring = require("randomstring");


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
 * Generates HTML for all elements inside another element.
 * @param {Array} content The contents of a higher tag.
 * @param {Number} indent The indentation level to use.
 */
 var generate_innerHTML = function generate_innerHTML(content, indent) {
    if (content.length > 0) {
        var first = content[0];
        // If onlye size 1, and type is text: do not use newlines.
        if ( (content.length == 1) && (typeof first == "string") ) {
            return first;
        } else {
            var innerHTML = content.map(function(sub) {
                return generate_tree(sub, indent + 1);
            }).join("\n");

            return "\n" + innerHTML + "\n" + create_indent(indent);
        }
    }
    return "";
};

/**
 * Generate soras definitions for HTML.
 * @param {Tag} tag The tag to get id, classes and attributes for.
 * @returns {String} String containing the soras definitions in HTML.
 */
 var generate_soras = function generate_soras(tag) {
    var resultHTML = "";

    // Add attributes
    var attributes = tag.attributes;
    for (var name in attributes) {
        if (attributes.hasOwnProperty(name)) {
            if (name[0] !== "@") {
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
 * @param {Tag} tag The tag to get id, classes and attributes for.
 * @param {Boolean} selfclosing Wether this tag is a self-closing tag.
 * @returns {String} String containing the opening tag for the given tag.
 */
 var generate_opentag = function generate_opentag(tag, selfclosing) {
    var tagname = tag.tagname;

    var resultHTML = "<" + tagname + generate_soras(tag);
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
 * @param {Tag} tag The tag to generate HTML code for.
 * @param {Number} indent The indentation level to use.
 * @private
 * @returns HTML for the given tag.
 */
 var generate_generic = function generate_generic(tag, indent) {
    preprocess_tag(tag);

    var content = tag.content;
    var resultHTML = create_indent(indent);

    // Generate opening tag
    resultHTML += generate_opentag(tag);

    // Add innerHTML
    resultHTML += generate_innerHTML(content, indent);

    // Generate closing tag
    resultHTML += generate_closetag(tag);

    return resultHTML;
};

/**
 * Generates HTML for a generic tag name, without any innerHTML and no
 * limitations on classes, ids or attributes. E.g. br, img...
 * @param {Tag} tag The tag to generate HTML code for.
 * @param {Number} indent The indentation level to use.
 * @private
 * @returns HTML for the given tag.
 */
 var generate_selfclosing = function generate_selfclosing(tag, indent) {
    preprocess_tag(tag);

    var resultHTML = create_indent(indent);

    resultHTML += generate_opentag(tag, true);
    return resultHTML;
};

/**
 * Generates HTML for a dynamic segment.
 * @param {DynamicExpression} dynamic The segment to generate code for.
 * @param {Number} indent The indentation level to use.
 * @private
 * @returns HTML for the given tag.
 */
 var generate_dynamic_expression = function generate_dynamic_expression(dynamic, indent) {
    var randomid = dynamic.idName;
    var expression = dynamic.expression;
    var html;

    if (randomid !== undefined) {
        html = "{{" + randomid + "}}";
    } else {
        html = "{{" + expression + "}}";
    }

    return html;
};

/**
 * Generates a dynamic if block.
 * @param {DynamicBlock} dynamic The dynamic block to generate HTML code for.
 * @param {Number} indent The current indentation level
 * @private
 * @returns HTML for the given tag.
 */
 var generate_dynamic_block_if = function generate_dynamic_block_if(dynamic, indent) {
    var randomid = dynamic.idName;
    var html = "";

    html += create_indent(indent) + "{{#if " + randomid + "}}\n";
    html += generate_list(dynamic.true_branch, indent + 1);
    html += "\n";

    if (dynamic.false_branch.length > 0) {
        html += create_indent(indent) + "{{else}}\n";
        html += generate_list(dynamic.false_branch, indent + 1);
        html += "\n";
    }

    html += create_indent(indent) + "{{/if}}\n";

    return html;
}

/**
 * Generates a dynamic if block.
 * @param {DynamicBlock} dynamic The dynamic block to generate HTML code for.
 * @param {Number} indent The current indentation level
 * @private
 * @returns HTML for the given tag.
 */
 var generate_dynamic_block_each = function generate_dynamic_block_each(dynamic, indent) {
    var randomid = dynamic.idName;
    var html = "";

    html += create_indent(indent) + "{{#each " + randomid + "}}\n";
    html += generate_list(dynamic.body, indent + 1);
    html += create_indent(indent) + "{{/each}}\n";

    return html;
}

/**
 * Generates HTML code for a dynamic block. E.g. {{#if predicate}} or {{#each object}}
 * @param {DynamicBlock} dynamic The dynamic block to generate HTML code for.
 * @param {Number} indent The current indentation level
 * @private
 * @returns HTML for the given tag.
 */
 var generate_dynamic_block = function generate_dynamic_block(dynamic, indent) {
    var type = dynamic.type;
    switch (type) {
        case "if":
        return generate_dynamic_block_if(dynamic, indent);

        case "each":
        return generate_dynamic_block_each(dynamic, indent);

        default:
        throw "Unknown type of dynamic block: '" + type + "'."
    }
}

/**
 * Returns the correct generator, given a tagname.
 * @param {String} tagname The tagname to find a generator for.
 * @private
 */
 var find_generator = function find_generator(tagname) {
    switch (tagname) {
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
 var generate_tree = function generate_tree(tree, indent) {
    if (typeof tree == "string") {
        return create_indent(indent) + tree;
    }

    if (tree instanceof DynamicExpression) {
        return generate_dynamic_expression(tree, indent);
    }

    if (tree instanceof DynamicBlock) {
        return generate_dynamic_block(tree, indent);
    }

    var tag = tree;
    var tagname = tag.tagname;
    var generator = find_generator(tagname);
    return generator(tag, indent);
};

/**
 * Generates HTML code for all the elements in the given array.
 * @param {Array} input The array to generate HTML for.
 * @param {Number} indentation The indentation level to use. If none given, defaults to 0.
 * @private
 * @returns HTML for the given array.
 */
 var generate_list = function generate_list(input, indentation) {
    // Set default value
    if (indentation === undefined) {
        indentation = 0;
    }

    return input.map(function (tree) {
        return generate_tree(tree, indentation);
    }).join("\n");
}

/**
 * Generates HTML for given list
 * @param {Array} input The parsed document
 * @param {ConvertorContext} newcontext The context to use
 * @returns HTML code for the given tree.
 */
 var generate = function generate(input, newcontext) {
    set_context(newcontext);

    var html = "<!DOCTYPE html>\n";
    html += "<html>\n";
    html += generate_list(input);

    html += "\n</html>";
    return html;
};


/***********/
/* Exports */
/***********/

exports.generate = generate;