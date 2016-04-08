var Tag            = require("./redstone-types.js").Tag;
var DynamicExpression = require("./redstone-types.js").DynamicExpression;
var DynamicBlock = require("./redstone-types.js").DynamicBlock;

var NextBlockType = {
    "BLOCK": 1,
    "TEXT": 2,
    "EXTENDED_TEXT": 3
};

/**
 * Splits a line in an identation level, and the content.
 * @param {String} line The line to split into a level, and the content.
 * @private
 * @returns {Object} The identation level (key: identation) and the remaning
 * contents (key: data).
 */
var parse_line_identation = function parse_line_identation(line) {
    var level = 0;
    var length = line.length;
    var data = "";

    for (var i = 0; i < length; i++) {
        var ch = line[i];

        if (ch == "\t") {
            level++;
        } else {
            data = line.substring(i, length);
            break;
        }
    }
    return {"identation": level, "data": data};
};

/**
 * Splits a tagline into tagdata, contents, and whether the next lines
 * should be handled as text blocks or not.
 * @param {String} data The contents of a line that should be splitted.
 * @private
 * @returns {Object} Object containing the tagdata (key: data), the remaning
 * content (key: content), and whether the next blocks are text or not
 * (key: next_type).
 */
var parse_tagline = function parse_tagline(data) {
    var n = data.indexOf(" ");
    var newdata = "";

    if (n == -1) { // No space
        var next_text = (data[data.length - 1] == ".");
        if (next_text) {
            var extended = (data[data.length - 2] == ".");
            if (extended) {
                // Truncate the dots
                newdata = data.substring(0, data.length - 2);
                return {
                    "data": newdata,
                    "content": "",
                    "next_type": NextBlockType.EXTENDED_TEXT
                };
            } else {
                // Truncate the dot
                newdata = data.substring(0, data.length - 1);
                return {
                    "data": newdata,
                    "content": "",
                    "next_type": NextBlockType.TEXT
                };
            }
        } else {
            return {
                "data": data,
                "content": "",
                "next_type": NextBlockType.BLOCK
            };
        }
    } else {
        newdata = data.substring(0, n);
        var content = data.substring(n + 1, data.length);
        return {
            "data": newdata,
            "content": content,
            "next_type": NextBlockType.BLOCK
        };
    }
};

/**
 * Returns whether the given string has length one (a character), and the
 * character is a letter (both uppercase and lowercase)
 * @param {String} str The string to check whether it is a letter.
 * @returns {Boolean} Whether the given string is a letter.
 */
function isLetter(str) {
  return str.length === 1 && str.match(/[a-z]/i);
}

/**
 * Returns whether the given string has length one (a character), and the
 * character is a number.
 * @param {String} str The string to check whether it is a number.
 * @returns {Boolean} Whether the given string is a number.
 */
function isNumber(str) {
  return (str.length === 1) && str.match(/[0-9]/);
}

/**
 * Reads a string, starting from a certain index, and finds the attribute
 * name and the attribute value, until it finds a ].
 * @param {String} data The string to use to find an attribute name/value.
 * @param {Number} idx The index the opening character ('[') starts on.
 * @returns {Object} Object with the resulting token (key: token) and the
 * next index to continue parsing (key: next_idx).
 */
function parse_tagdata_attribute(data, idx) {
    idx++;
    var name = "";
    var value = "";
    var read_value = false;
    var buffer = "";

    while (idx < data.length) {
        var c = data[idx];

        if (c === "]") {
            if (read_value) {
                value = buffer;
            } else {
                name = buffer;
            }

            return {
                token: {
                    type: "attributevalue",
                    name: name,
                    value: value
                },
                "next_idx": idx
            };
        } else if (c === "=") {
            if (read_value) {
                throw "Already reading value.";
            }
            name = buffer;
            buffer = "";
            read_value = true;
        } else if (isNumber(c)) {
            if ( (!(read_value)) && (buffer === "") ) {
                throw "Attribute name can't start with a number.";
            }
            buffer += c;
        } else {
            buffer += c;
        }

        idx++;
    }

    throw "Did not find ] to end attribute definition";
}

/**
 * Reads a tagdata string and makes a tokenized version.
 * @param {String} data The string to tokenize.
 * @returns {Array} List of all the tokens that were found in this string.
 */
var parse_tagdata_to_tokens = function parse_tagdata_to_tokens(data) {
    var result = [];
    var buffer = "";

    var idx = 0;

    while (idx < data.length) {
        var c = data[idx];
        if ( (c === "#") || (c === ".") || (c === "[") ) {
            if (buffer !== "") {
                result.push({type: "string", data: buffer});
                buffer = "";
            }
            if (c === "[") {
                var res = parse_tagdata_attribute(data, idx);
                idx = res.next_idx;
                result.push(res.token);
            } else {
                result.push({type: "seperator", "data": c});
            }
        } else if (isLetter(c)) {
            buffer += c;
        } else if ( (isNumber(c)) || (c === "-") || (c === "_") ) {
            if (buffer === "") {
                throw "Tagname, or attribute, can't start with '" + c + "'";
            }
            buffer += "c";
        } else {
            throw "Unknown character '" + c + "'.";
        }

        idx++;
    }

    if (buffer !== "") {
        result.push({type: "string", data: buffer});
    }

    return result;
};

/**
 * Parses a tag definition (both the sora definitions, and the tagname), 
 * and creates a new Tag (with empty contents).
 * @param {String} data The tag definition.
 * @private
 * @returns {Tag} The tag with id, classes and attributes filled in.
 */
var parse_tagdata = function parse_tagdata(data) {
    var tokens = parse_tagdata_to_tokens(data);

    if (tokens[0].type !== "string") {
        throw "Tagdata should start with type of tag.";
    }

    var tagname = tokens[0].data;
    var id = null;
    var classes = [];
    var attributes = {};

    var idx = 1;

    while (idx < tokens.length) {
        var token = tokens[idx];
        var type = token.type;

        switch (type) {
            case "string":
                throw "Unable to apply string on position '" + idx + "'.";

            case "seperator":
                if (idx + 1 >= tokens.length) {
                    throw "Token overflow.";
                }

                var sepchar = token.data;
                var nexttoken = tokens[idx + 1];
                
                if (nexttoken.type !== "string") {
                    throw "Next token is not a string.";
                }

                switch (sepchar) {
                    case ".":
                        classes.push(nexttoken.data);
                        break;

                    case "#":
                        if (id !== null) {
                            throw "double id given";
                        }
                        id = nexttoken.data;
                        break;

                    default:
                        throw "Unknown seperator type.";
                }

                // Extra fast-forward, as we are parsing 2 tokens here
                idx++;
                break;

            case "attributevalue":
                if (attributes.hasOwnProperty(token.name)) {
                    throw "attribute already used";
                }
                attributes[token.name] = token.value;
                break;
        }

        idx++;
    }

    return new Tag(tagname, id, classes, attributes);
};

/**
 * Transforms a text, replacing {{expression}} with DynamicExpressions. The result
 * of this function is an array containing all segments.
 * @param {String} input The input string.
 * @private
 * @return {Array} Array, alternating between text and DynamidSegments.
 */
var parse_text = function parse_text(input) {
    var n_open = input.indexOf("{{");
    if (n_open == -1) {
        return [input];
    }
    var n_close = input.indexOf("}}");
    if (n_open > n_close) {
        throw "}} before {{";
    }
    var first = input.substring(0, n_open);
    var expression = input.substring(n_open + 2, n_close);
    var rest = input.substring(n_close + 2, input.length);

    var dsegment = new DynamicExpression(expression);
    return [first, dsegment].concat(parse_text(rest));
};

/**
 * Adds the given textual content to content of a tag.
 * @param {Tag} tag The tag to add new content to.
 * @param {String} content The raw contents.
 * @private
 */
var add_text_content_to_tag = function add_text_content_to_tag(tag, content) {
    var parsed_text = parse_text(content);
    // Do not use concat, as it creates a new array.
    parsed_text.forEach(function (segment) {
        tag.content.push(segment);
    });
};

/**
 * Parses all the blocks starting at a certain identation, and adds the result
 * as the content of the given tag.
 * @param {Array} lines Array containing all the lines.
 * @param {Tag} tag The tag to add the new blocks to.
 * @param {Number} idx The index in the lines array to start parsing.
 * @param {Number} identation The identation level of the prior block.
 * @private
 * @returns {Object} Object with the next index to use for parsing the next
 * block (key: next_idx), and the final tag.
 */
var parse_subblocks = function parse_subblocks(lines, tag, idx, identation) {
    var next_idx = idx;
    var has_next = (next_idx < lines.length);

    while (has_next) {
        idx = next_idx;
        var next = parse_line_identation(lines[idx]);

        if (next.identation > identation) {
            var a = parse_block(lines, idx);
            next_idx = a.next_idx;
            tag.content.push(a.result);
        } else {
            break;
        }

        has_next = (next_idx < lines.length);
    }

    return {"next_idx": next_idx, "result": tag};
};

/**
 * Parses all the blocks starting at a certain identation, and adds the result
 * as the content of the given tag. Expects all the following blocks to be
 * textual blocks. Unless they have an higher identation of the first block.
 * @param {Array} lines Array containing all the lines.
 * @param {Tag} tag The tag to add the new blocks to.
 * @param {Number} idx The index in the lines array to start parsing.
 * @param {Number} identation The identation level of the prior block.
 * @private
 * @returns {Object} Object with the next index to use for parsing the next
 * block (key: next_idx), and the final tag.
 */
var parse_textblocks = function parse_textblocks(lines, tag, idx, identation) {
    var next_idx = idx;
    var has_next = (next_idx < lines.length);
    
    // Identation of text blocks: if larger, parse as normal blocks again.
    var cmp_identation = -1;
    while (has_next) {
        idx = next_idx;
        var next = parse_line_identation(lines[idx]);
        var next_identation = next.identation;

        if (next_identation > identation) {
            if ( (cmp_identation === -1) ||
                 (cmp_identation == next_identation) ) {
                add_text_content_to_tag(tag, next.data);

                cmp_identation = next_identation;
                next_idx = idx + 1;
            } else {
                var a = parse_block(lines, idx);
                next_idx = a.next_idx;
                tag.content.push(a.result);
            }
        } else {
            break;
        }

        has_next = (next_idx < lines.length);
    }

    return {"next_idx": next_idx, "result": tag};
};

/**
 * Removes identation from a string.
 * @param {Number} ident The indentation level.
 * @param {String} str The string to delete identation from.
 * @private
 */
var remove_indent = function remove_indent(indent, str) {
    return str.substring(indent, str.length);
};

/**
 * Parses all the blocks starting at a certain identation, and adds the result
 * as the content of the given tag. Expects all the following blocks to be
 * textual blocks. Unless they have an higher identation of the first block.
 * @param {Array} lines Array containing all the lines.
 * @param {Tag} tag The tag to add the new blocks to.
 * @param {Number} idx The index in the lines array to start parsing.
 * @param {Number} identation The identation level of the prior block.
 * @private
 * @returns {Object} Object with the next index to use for parsing the next
 * block (key: next_idx), and the final tag.
 */
var parse_extended_textblocks =
    function parse_extended_textblocks(lines, tag, idx, identation) {
    var next_idx = idx;
    var has_next = (next_idx < lines.length);

    while (has_next) {
        idx = next_idx;
        var next_raw = lines[idx];
        var next = parse_line_identation(next_raw);
        var next_identation = next.identation;

        if (next_identation > identation) {
            var content = remove_indent(identation, next_raw);
            add_text_content_to_tag(tag, content);
            next_idx = idx + 1;
        } else {
            break;
        }

        has_next = (next_idx < lines.length);
    }

    return {"next_idx": next_idx, "result": tag};
};

/**
 * Returns the correct parse_... method, depending on the type of the next
 * lines.
 * @param {NextBlockType} type The type.
 */
var get_method_of_next_type = function get_method_of_next_type(type) {
    switch (type) {
        case NextBlockType.BLOCK:
            return parse_subblocks;

        case NextBlockType.TEXT:
            return parse_textblocks;

        case NextBlockType.EXTENDED_TEXT:
            return parse_extended_textblocks;

        default:
            throw "Unsupported value.";
    }
};

// TODO: JSDoc
var is_dynamicblock = function is_dynamicblock(str) {
    var checkstr = "{{#";
    return (str.indexOf(checkstr) === 0);
};

// TODO: JSDoc
var parse_dynamicblock_tag = function parse_dynamicblock_tag(data) {
    var rest = data.substring(3, data.length);
    var endStr = rest.substring(rest.length - 2, rest.length);

    if (endStr !== "}}") {
        throw "Dynamic Block should end with '}}'";
    }

    rest = rest.substring(0, rest.length - 2);
    var rests = rest.split(" ", 2);

    return {"keyword": rests[0], "rest": rests[1]};
}

// TODO: JSDoc
var parse_dynamicblock = function parse_dynamicblock(lines, idx) {
    var current = parse_line_identation(lines[idx]);
    var identation = current.identation;
    var data = current.data;
    var parsed_tag = parse_dynamicblock_tag(data);
    var keyword = parsed_tag.keyword;

    var result = null;

    switch (keyword) {
        case "if":
            var expression = parsed_tag.rest;
            result = new DynamicBlock("if");
            result.predicate = expression;
            
            result.true_branch  = [];
            result.false_branch = [];

            var true_branch = parse_block(lines, idx + 1);
            result.true_branch.push(true_branch.result);
            var next_idx = true_branch.next_idx;

            var at_true_branch = true;
            var parsedblock;

            // While there is more to read
            while (next_idx < lines.length) {
                var next = parse_line_identation(lines[next_idx]);

                // More in current branch
                if (next.identation > identation) {
                    parsedblock = parse_block(lines, next_idx);
                    
                    if (at_true_branch) {
                        result.true_branch.push(parsedblock.result)
                    } else {
                        result.false_branch.push(parsedblock.result)
                    }

                    next_idx = parsedblock.next_idx;
                } else {
                    // Possible {{#else}}
                    if (is_dynamicblock(next.data)) {
                        var parsed_next_tag = parse_dynamicblock_tag(next.data);
                        if (parsed_next_tag.keyword === "else") {
                            if (!at_true_branch) {
                                throw "already at else branch, can't have multiple instances of else in same if block";
                            }


                            if ( (parsed_next_tag.rest !== "") &&
                                 (parsed_next_tag.rest !== undefined) ) {
                                throw "else expects no arguments. Found '" + parsed_next_tag.rest + "'";
                            }

                            var false_branch = parse_block(lines, next_idx + 1);
                            result.false_branch.push(false_branch.result);
                            next_idx = false_branch.next_idx;

                            at_true_branch = false;
                        }
                    } else {
                        break;
                    }
                }

                
            }
            return {"next_idx": next_idx, "result": result};

        case "else":
            throw "Standalone else is not allowed.";

        case "foreach":
            throw "NYI";

        default:
            throw "Unknown type of Dynamic Block.";
    }
}

/**
 * Parses a block by creating a new tag, and reading the next blocks with an
 * higher identation level, and adding it to the contents of this tag.
 * @param {Array} lines Array containing all the lines.
 * @private
 * @returns {Object} Object with the next index to use for parsing the next
 * block (key: next_idx), and the final tag.
 */
var parse_block = function parse_block(lines, idx) {
    var current = parse_line_identation(lines[idx]);
    var identation = current.identation;
    var data = current.data;

    if (is_dynamicblock(data)) {
        return parse_dynamicblock(lines, idx);
    }

    var tagdata = parse_tagline(data);
    var next_type = tagdata.next_type;
    var data = tagdata.data;
    var content = tagdata.content;
    
    var tag = parse_tagdata(data);
    var next_idx = idx + 1;

    if (content.length > 0) {
        add_text_content_to_tag(tag, content);
    }

    var method = get_method_of_next_type(next_type);
    return method(lines, tag, next_idx, identation);
};

/**
 * Parses an input string, and returns a list of trees (Tags).
 * @param {String} input The complete input string.
 * @public
 * @returns {Array} Array containing trees starting at the top level.
 */
var parse = function parse(input) {
    var lines = input.split("\n");

    // Filter out blank lines
    lines = lines.filter(function(line) {
        var no_whitespace = line.replace(/\s/g, "");
        return (no_whitespace !== "");
    });

    var result = [];
    var idx = 0;
    var has_next = (idx < lines.length);
    
    while (has_next) {
        var blockresult = parse_block(lines, idx);
        result.push(blockresult.result);
        idx = blockresult.next_idx;
        has_next = (idx < lines.length);
    }

    return result;
};

// Export module
exports.parse = parse;