/************************************/
/* Command line version of Redstone */
/************************************/

var redstone = require("./redstone.js");
var utils    = require("./utils.js");
var fs       = require("fs");
var path     = require("path");

// Load given file as argument from CLI
var inputFile = process.argv[2];

if (inputFile === undefined) {
	console.log("No input file given.");
	process.exit(1);
}

// Read the file from disk
try {
	var stats = fs.statSync(inputFile);
} catch (e) {
	console.log("Could not read file!");
	process.exit(1);
}

// Run Redstone tool
var input = utils.readFile(inputFile);
var result = redstone.generate(input);
var client = result.client;
var server = result.server;

// Output the result in files
utils.writeFile("server_env/server.js", server);
utils.writeFile("client_env/index.html", client);

// Exit
process.exit(0);