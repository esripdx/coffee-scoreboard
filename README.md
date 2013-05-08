# Coffee Scoreboard

## Running

    $ node index.js

## API

### /score

Returns the current score in `from: { to: count }` format

### /coffee

Parameters:
* from
* to

### /status

Parameters:
* user

### /wants

Returns all wants

### /broadcast (not yet implemented)

Parameters:
* user

Broadcasts to IRC that user is at (or going to) Barista

Returns the current score or error

## Required files

Please be sure to create your own `config.json`, `data/coffee.log` and `data/store.json` files. Example files have been provided with a `.dist` file extension.
