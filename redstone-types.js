/***************/
/* Definitions */
/***************/

/**
 * Represents an HTML tag, together with the content.
 * @constructor
 * @param {String} tagname - The name of the tag.
 * @param {String} [id] - The id of the tag.
 * @param {Array} [classes] - Array containing the classes of the tag.
 * @param {Object} [attributes] - Object containing the attributes and values
 * of this tag.
 * @param {Array} [content] - The contents of this tag.
 * @param {Array} [idNames] - The idNames and idNames that are being used.
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
 * @param {String} expression The raw, unparsed, expression
 */
var DynamicExpression = function DynamicExpression(expression) {
	this.expression = expression;
	this.crumb = null;
};

/**
 * Object keeping track of the contents of a dynamic if block.
 * @constructor
 * @param {String} predicateExpression The raw, unparsed, expression for the predicate
 */
var DynamicIfBlock = function DynamicIfBlock(predicateExpression) {
	this.type = "if";
	this.crumb = null;
	this.predicateExpression = predicateExpression;
	this.true_branch = [];
	this.false_branch = [];
};

/**
 * Object keeping track of the contents of a dynamic each block.
 * @constructor
 * @param {String} objectExpression The raw, unparsed, expression for the object
 */

var DynamicEachBlock = function DynamicEachBlock(objectExpression) {
	this.type = "each";
	this.crumb = null;
	this.objectExpression = objectExpression;
	this.body = [];
};

/**
 * Object with options, and metadata of a conversion.
 * @constructor
 * @param {Object} options Object containing all the options, for possible
 * values and default values, see redstone-parser.js.
 */
var ConverterContext = function ConverterContext(options) {
	this.js = []; // List of generated Javascript
	this.callbacks = []; // List of callback names (as strings)
	this.crumbs = []; // List containing crumbs
	this.options = options; // Object containing options
	this.css = false; // Generated + supplied css
	this.idNames = []; // List of generated idNames, to make sure there are no duplicates
	this.varname2declNode = {}; // Mapping from variable names (as strings) to their declaration nodes
	this.stip = {}; // Information about Stip tool is temporary saved here
};

/**
 * Crumb object, containing information about what needs to be done when some variable changes value in the GUI.
 * @constructor
 * @param {String} idName The id of the crumb
 * @param {Array} variableNames Array containing the variable names
 * @param {Object} parsedExpression The parsed expression
 */
var Crumb = function Crumb(idName, variableNames, parsedExpression) {
	this.idName = idName; // The randomly generated name of this crumb
	this.variableNames = (variableNames ? variableNames : []); // Array containing all the top-level variable names (for static analysis)
	this.parsedExpression = (parsedExpression ? parsedExpression : null); // Used while evaluating crumbs
};

/***********/
/* Exports */
/***********/

exports.Tag = Tag;
exports.DynamicExpression = DynamicExpression;
exports.ConverterContext = ConverterContext;
exports.DynamicIfBlock = DynamicIfBlock;
exports.DynamicEachBlock = DynamicEachBlock;
exports.Crumb = Crumb;