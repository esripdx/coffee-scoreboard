var bricks = require('bricks'),
    fs     = require('fs'),
    url    = require('url');


function writeData (store) {
  fs.writeFileSync("./data/store.json", JSON.stringify(store), 'utf8');
}

function readData () {
  var data = fs.readFileSync("./data/store.json", 'utf8');
  var store;
  try {
    store = JSON.parse(data);
  } catch (err) {
    console.error("Unable to parse data from store");
    store = { };
  }

  return store;
}


var appServer = new bricks.appserver();

var store = readData();


function scoreRoute (request, response) {
  response.setHeader('Content-Type', 'application/json');
  response.write(JSON.stringify(store));
  response.end();
}

function modifyRoute (request, response) {
  var payload = url.parse(request.url, true);

  response.setHeader('Content-Type', 'application/json');
  if (payload.query && payload.query.x && payload.query.y && payload.query.direction) {
    var x = payload.query.x,
        y = payload.query.y,
        direction = payload.query.direction;

    if (store[x] === undefined) {
      store[x] = { };
    }
    if (store[x][y] === undefined) {
      store[x][y] = 0;
    }

    if (direction === 'up') {
      store[x][y]++;
    } else if (direction === 'down') {
      store[x][y]--;
    } else {
      response.write(JSON.stringify({ "error": "direction must be up or down" }));
      response.end();
      return;
    }

    writeData(store);

    response.write(JSON.stringify(store));
  } else {
    response.write(JSON.stringify({"error": "need an x, y, and direction"}));
  }

  response.end();
}

var redirects = [
  {
    path: "^/$",
    url:  "/index.html"
  }
];

appServer.addRoute(".+", appServer.plugins.redirect, { section: "pre", routes: redirects });

appServer.addRoute(".+", appServer.plugins.filehandler, { basedir: "./htdocs" });
appServer.addRoute("/score", scoreRoute);
appServer.addRoute("/coffee", modifyRoute);
appServer.addRoute(".+", appServer.plugins.fourohfour);


var server = appServer.createServer();
server.listen(8080);