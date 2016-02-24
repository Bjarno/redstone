var escodegen = require("escodegen");
var tiersplit = require("./../jspdg/stip/tiersplit.js").tiersplit;
var head = require("./utils.js").head;
var subhead = require("./utils.js").subhead;

var result = tiersplit("/* @server */ {function foo() {/*@reply */ bar(3)}} /* @client */ {function bar(y) {return 42+y;} foo();}");

var clientJS = escodegen.generate(result[0].program);
var serverJS = escodegen.generate(result[1].program);

head("Result");

subhead("Client");
console.log(clientJS);

subhead("Server");
console.log(serverJS);