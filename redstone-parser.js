var Tag            = require("./redstone-types.js").Tag;
var DynamicSegment = require("./redstone-types.js").DynamicSegment;
var Sora           = require("./redstone-types.js").Sora;

var NextBlockType = {
	"BLOCK": 1,
	"TEXT": 2,
	"EXTENDED_TEXT": 3
};

var array_indexOfSmallest = require("./utils.js").array_indexOfSmallest;

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
 * Returns the tagname, as well as the remaining soras (selectors or
 * attributes).
 * @param data The full tag, including the tagname and soras, as one string.
 * @private
 * @returns {Object} Object containing the name of the tag (key: tagname),
 * and the remaining soras (key: soras). If no soras are given, it's value
 * is false.
 */
var parse_tagdata_tagname = function parse_tagdata_tagname(data) {
	var terminators = [".", "#", "["];
	var dis_to_terms = terminators.map(function(terminator) {
		return data.indexOf(terminator);
	});
	var shortest_term_idx = array_indexOfSmallest(dis_to_terms, -1);
	var has_terminator = (shortest_term_idx !== -1);

	if (has_terminator) {
		var dis_shortest_terminator = dis_to_terms[shortest_term_idx];
		var tagname = data.substring(0, dis_shortest_terminator);
		var soras = data.substring(dis_shortest_terminator, data.length);

		return {"tagname": tagname, "soras": soras};
	} else {
		return {"tagname": data, "soras": false};
	}
};

/**
 * Splits a soras string, starting with an attribute definition, into
 * the attribute part, and the remaining contents.
 * @param {String} soras The soras string, starting with an attribute
 * definition.
 * @private
 * @returns {Object} Object with the attribute definition (key: first),
 * and the remaining soras definitions. If no soras definitions remain, it's
 * value is false.
 */
var split_soras_attribute = function split_soras_attribute(soras) {
	var n = soras.indexOf("]");
	if (n == -1) {
		throw "] not found";
	}
	var first = soras.substring(0, n + 1);
	var rest = soras.substring(n + 1, soras.length);
	if (rest.length === 0) {
		rest = false;
	}

	return {"first": first, "rest": rest};
};

/**
 * Splits a soras string into the first sora, and the remaning soras.
 * @param {String} soras The soras to split into the first and rest.
 * @private
 * @returns {Object} Object with the first sora (key: first), and the
 * remaning soras definitions. If no soras definitions remain, it's
 * value is false.
 */
var split_soras = function split_soras(soras) {
	var terminators = [".", "#", "["];
	var first_ch = soras[0];
	if (first_ch == "[") {
		return split_soras_attribute(soras);
	}

	var soras_excl1 = soras.substring(1, soras.length);
	var dis_to_terms = terminators.map(function(terminator) {
		return soras_excl1.indexOf(terminator);
	});
	var shortest_term_idx = array_indexOfSmallest(dis_to_terms, -1);
	var has_terminator = (shortest_term_idx !== -1);

	if (has_terminator) {
		// +1 as first character was ommitted in search
		var dis_shortest_terminator = dis_to_terms[shortest_term_idx] + 1;
		var first = soras.substring(0, dis_shortest_terminator);
		var rest = soras.substring(dis_shortest_terminator, soras.length);
		return {"first": first, "rest": rest};
	} else {
		return {"first": soras, "rest": false};
	}
};

/**
 * Parses a single Sora into type, name and value. Name is only being used
 * if type is 'attribute'.
 * @param {String} A single Sora definition.
 * @private
 * @returns {Sora} A parsed sora object.
 */
var parse_sora = function parse_sora(sora) {
	var first_ch = sora[0];
	var type = null;
	var name = "";
	var value = "";

	switch (first_ch) {
		case ".": type = "class"; break;
		case "#": type = "id"; break;
		case "[": type = "attribute"; break;
	}

	if (type !== "attribute") {
		value = sora.substring(1, sora.length);
	} else {
		var n = sora.indexOf("=");
		if (n == -1) {
			name = sora.substring(1, sora.length - 1);
			value = true;
		} else {
			name = sora.substring(1, n);
			value = sora.substring(n + 1, sora.length - 1);
		}
	}

	return new Sora(type, name, value);
};

/**
 * Parses a tag definition (both the sora definitions, and the tagname), 
 * and creates a new Tag (with empty contents).
 * @param {String} data The tag definition.
 * @private
 * @returns {Tag} The tag with id, classes and attributes filled in.
 */
var parse_tagdata = function parse_tagdata(data) {
	var a = parse_tagdata_tagname(data);
	var tagname = a.tagname;
	var soras = a.soras;

	var rest = soras;
	var id = null;
	var classes = [];
	var attributes = {};

	while (rest !== false) {
		var b = split_soras(rest);
		var sora = b.first;
		rest = b.rest;
		
		var parsed_sora = parse_sora(sora);

		switch (parsed_sora.type) {
			case "class":
				classes.push(parsed_sora.value);
				break;

			case "id":
				if (id !== null) {
					throw "double id given";
				}
				id = parsed_sora.value;
				break;

			case "attribute":
				if (attributes.hasOwnProperty(parsed_sora.name)) {
					throw "attribute already used";
				}
				attributes[parsed_sora.name] = parsed_sora.value;
				break;
		}
	}

	return new Tag(tagname, id, classes, attributes);
};

/**
 * Transforms a text, replacing {{expression}} with DynamicSegments. The result
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

	var dsegment = new DynamicSegment(expression);
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
		var next = lines[idx];
		var next_identation = next.identation;

		if (next_identation > identation) {
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
		var next = lines[idx];
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
	
	// Identation of text blocks: if larger, parse as normal blocks again.
	var cmp_identation = -1;
	while (has_next) {
		idx = next_idx;
		var next = lines[idx];
		var next_identation = next.identation;

		if (next_identation > identation) {
			if ( (cmp_identation === -1) ||
				 (cmp_identation == next_identation) ) {
				cmp_identation = next_identation;
			}

			var content = create_indent(next_identation - cmp_identation);
			content += next.data;
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
	var current = lines[idx];
	var identation = current.identation;

	var tagdata = parse_tagline(current.data);
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
	var count = lines.length;

	for (var i = 0; i < count; i++) {
		var res = parse_line_identation(lines[i]);
		lines[i] = res;
	}

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