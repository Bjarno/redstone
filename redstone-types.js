/***************/
/* Definitions */
/***************/

/**
 * Represents an HTML tag, together with the content.
 * @constructor
 * @param {String} tagname - The name of the tag.
 * @param {String} id - The id of the tag.
 * @param {Array} classes - Array containing the classes of the tag.
 * @param {Object} attributes - Object containing the attributes and values
 * of this tag.
 * @param {Array|undefined} content - The contents of this tag.
 * @private
 */
var Tag = function Tag(tagname, id, classes, attributes, content) {
	this.tagname = tagname;
	this.attributes = (attributes === undefined ? {} : attributes);
	this.id = (id === undefined ? false : id);
	this.classes = (classes === undefined ? [] : classes);
	this.content = (content === undefined ? [] : content);
};

/**
 * Represents a segment that is dynamically updated.
 * @constructor
 * @param {String} variablename - The name of the variable, that should be
 * used to dynamically update this segment.
 * @public
 */
var DynamicExpression = function DynamicExpression(expression, idName) {
	this.expression = expression;
	this.idName = idName;
};

/**
 * Object keeping track of the contents of a dynamic block. E.g. an {{#if}} or an {{#each}}
 * @constructor
 * @param {String} type The type of the dynamic block.
 */
var DynamicBlock = function DynamicBlock(type) {
	this.type = type;
}

/**
 * Object with options, and metadata of a conversion.
 * @constructor
 * @param {Object} options Object containing all the options, for possible
 * values and default values, see redstone-parser.js.
 */
var ConverterContext = function ConverterContext(options) {
	this.js = [];
	this.callbacks = [];
	this.crumbs = [];
	this.options = options;
	this.css = false;
}


/***********/
/* Exports */
/***********/

exports.Tag = Tag;
exports.DynamicExpression = DynamicExpression;
exports.ConverterContext = ConverterContext;
exports.DynamicBlock = DynamicBlock;