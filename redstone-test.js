var redstone = require("./redstone.js");
var utils = require("./utils.js");

var input = utils.readFile("input2.redstone");
utils.dump(redstone.generate(input));