var redstone = require("./redstone.js");
var utils    = require("./utils.js");
var fs       = require("fs");
var path     = require("path");

var inputFile = process.argv[2];

if (inputFile === undefined) {
	console.log("No input file given.");
	process.exit(1);
}

if (!(fs.existsSync(path.join("./", inputFile)))) {
	console.log("Input file doesn't exist.");
	process.exit(1);
}

var input = utils.readFile(inputFile);
var result = redstone.generate(input);
var client = result.client;
var server = result.server;

utils.writeFile("server_env/server.js", server);
utils.writeFile("client_env/index.html", client);

process.exit(0);