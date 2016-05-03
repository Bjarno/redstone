# Redstone Templating Language

## Install

Solve dependencies using npm.

```
$ npm install
```

## Usage

```
$ node main.js <filename>
```

Replace filename with the name of the input file (e.g. `examples/todos.redstone`), the tool automatically saves the output in `client_env/index.html` (for clientside) and `server_env/server.js` (for serverside: in Node.js).

Running the server:

```
$ cd server_env
$ node server.js
```

Substitute `node` with whatever name you normally call it (sometimes just `node`, other times `nodejs`, depending on your distribution or Operating System)

If server fails to start, run `npm install` first in `server_env` folder, as all the libraries needed to run the application need to be fetched first. Client-side libraries are included by default, and don't need bower to install.

## Examples

These example should suffice to understand how programs are written using this tool.

- Basic chat example by using shared stores: [chat.redstone](https://github.com/Bjarno/redstone/blob/master/examples/chat.redstone) (16 sloc)
- Basic chat example by using remote procedures: [old-chat.redstone](https://github.com/Bjarno/redstone/blob/master/examples/old-chat.redstone) (25 sloc)
- Simple todo list application: [todos.redstone](https://github.com/Bjarno/redstone/blob/master/examples/todos.redstone) (26 sloc)
- Example showing how two-way binding works [twoway-arrays.redstone](https://github.com/Bjarno/redstone/blob/master/examples/twoway-arrays.redstone) (26 sloc)
- Validating input from a two-way binded field: [twoway-checking.redstone](https://github.com/Bjarno/redstone/blob/master/examples/twoway-checking.redstone) (31 sloc)
- Basic example by using arrays as a dynamic expression: [change-color.redstone](https://github.com/Bjarno/redstone/blob/master/examples/change-color.redstone) (16 sloc)
- More advanced example, showcasing most of the features: [full-example.redstone](https://github.com/Bjarno/redstone/blob/master/examples/full-example.redstone) (109 sloc)