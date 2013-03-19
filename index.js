process.chdir(__dirname);
var api = require('zenircbot-api');
var bot_config = api.load_config('../../bot.json');
var zen = new api.ZenIRCBot(bot_config.redis.host,
                            bot_config.redis.port,
                            bot_config.redis.db);
var config = api.load_config('./config.json');
var sub = zen.get_redis_client();
var redis = zen.get_redis_client();

var bricks = require('bricks'),
    fs     = require('fs'),
    url    = require('url');

var XMLWriter = require('xml-writer'),
    ATOMWriter = require('atom-writer');

var dataStore = "./data/store.json";
var logFile = "./data/coffee.log";
var lastModified = new Date();

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

function writeData (store) {
  fs.writeFileSync(dataStore, JSON.stringify(store), 'utf8');
  lastModified = new Date();
}

function readData () {
  var data = fs.readFileSync(dataStore, 'utf8');
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

    var log = new Date().toString() + ": " + x + " paid " + y + " " + direction + "\n";
    fs.appendFileSync(logFile, log);
    writeData(store);

    response.write(JSON.stringify(store));
  } else {
    response.write(JSON.stringify({"error": "need an x, y, and direction"}));
  }

  response.end();
}

function atomRoute (request, response) {
  var xwriter = new XMLWriter(true);
  var atom = new ATOMWriter(xwriter);

  var data = [];
  for(var y in store) {
    for(var x in store[y]) {
      if(store[y][x] > 0) {
        data.push(y.toString().capitalize()+" owes "+x.capitalize()+" "+store[y][x]+" coffee"+(store[y][x] > 1 ? "s" : ""));
      }
    }
  }

  atom
    .startFeed('urn:coffee', lastModified, lastModified)
    .writeStartIndex(1)
    .writeItemsPerPage(data.length)
    .writeTotalResults(data.length)
    .writeTitle("Coffee Board")
    .writeLink(config.baseURL+"score.atom", "application/atom+xml", "self");

  for(var i in data) {
    atom
      .startEntry("urn:coffee:"+lastModified.toISOString()+":"+i, lastModified, lastModified)
      .writeTitle(data[i])
      .writeContent(data[i])
      .writeAuthor("Esri Portland")
      .endEntry();
  }

  atom.endFeed();

  response.setHeader('Content-Type', 'text/xml');
  response.write(atom.writer.toString());
  response.end();
}

function peopleRoute (request, response) {
  response.setHeader('Content-Type', 'application/json');
  response.write(JSON.stringify(config.people));
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
appServer.addRoute("/score$", scoreRoute);
appServer.addRoute("/score\.atom", atomRoute);
appServer.addRoute("/coffee", modifyRoute);
appServer.addRoute("/people", peopleRoute);
appServer.addRoute(".+", appServer.plugins.fourohfour);

appServer.addEventHandler('route.fatal', function (error) { console.log("FATAL: " + error); console.dir(error); });
appServer.addEventHandler('run.fatal', function (error) { console.log("FATAL: " + error); console.dir(error); });

var server = appServer.createServer();
server.listen(config.listen);

