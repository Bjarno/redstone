var redstone = require("./redstone.js");
var utils = require("./utils.js");

var input = utils.readFile("input.redstone");
utils.dump(redstone.generate(input));