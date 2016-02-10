var parser = require("./redstone-parser.js");
var converter = require("./redstone-converter.js");

var generate = function generate(input) {
	var result_parse = parser.parse(input);
	var result_html = converter.generate(result_parse);

	return {
		"html": result_html.html,
		"js": result_html.context.js,
		"dynamics": result_html.context.dynamics
	};
};

exports.generate = generate;