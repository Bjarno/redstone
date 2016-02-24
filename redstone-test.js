var redstone = require("./redstone.js");
var utils = require("./utils.js");

var input = utils.readFile("input2");
utils.dump(redstone.generate(input));