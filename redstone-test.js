var redstone = require("./redstone.js");
var utils = require("./utils.js");

var input = utils.readFile("input2");
var result = redstone.generate(input);
var client = result.client;
var server = result.server;

utils.writeFile("server_env/server.js", server);
utils.writeFile("client_env/index.html", client);