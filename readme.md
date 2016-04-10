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

Replace filename with the name of the input file (e.g. `input.redstone`), the tool automatically saves the output in `client_env/index.html` (for clientside) and `server_env/server.js` (for serverside: in Node.js).

Running the server:

```
$ cd server_env
$ node server.js
```

If server fails to start, run `npm install` first in `server_env` folder.

## Examples

- Basic chat example in 32 lines of code: [min-input.redstone](https://github.com/Bjarno/redstone/blob/master/min-input.redstone)
- More advanced example, showcasing most of the features: [input.redstone](https://github.com/Bjarno/redstone/blob/master/input.redstone)