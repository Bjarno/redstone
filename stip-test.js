var tiersplit = require("./../jspdg/stip/tiersplit.js").tiersplit;
var result = tiersplit("/* @server */ {function foo() {/*@reply */ bar(3)}} /* @client */ {function bar(y) {return 42+y;} foo();}");

console.log("\n\n\n\n");
console.log("==============");
console.log("\n\n\n\n");

console.log(result);

/*
var dump = require("./utils.js").dump;
dump(result);
*/