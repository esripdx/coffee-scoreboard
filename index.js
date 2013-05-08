process.chdir(__dirname);

// config
var config = require('./config.json');

// server dependencies
var bricks     = require('bricks'),
    fs         = require('fs'),
    url        = require('url'),
    request    = require('request');

// check for IRC bot
var irc = fs.existsSync(config.botConfigPath);
if (irc) {
  var loqi = require('./loqi');
} else {
  console.log("No IRC bot configured");
}

// data
var data      = require('./data');
var store     = data.read();
var writeData = data.write;
var atomRoute = data.atom;
var wants     = require('./wants');

// paths
var logFile = "./data/coffee.log";

var appServer = new bricks.appserver();

// routes

function scoreRoute(request, response) {
  response.setHeader('Content-Type', 'application/json');
  response.write(JSON.stringify(store));
  response.end();
}

function modifyRoute(request, response) {
  var payload = url.parse(request.url, true);

  response.setHeader('Content-Type', 'application/json');

  if (payload.query && payload.query.from && payload.query.to) {
    var from = payload.query.from.toLowerCase(),
        to   = payload.query.to.toLowerCase();

    if (from === to) {
      response.write(JSON.stringify({"error": "you can't give yourself coffee"}));
      return response.end();
    }

    if (store[from] === undefined) {
      store[from] = {};
    }
    if (store[from][to] === undefined) {
      store[from][to] = 0;
    }
    if (store[to] === undefined) {
      store[to] = {};
    }
    if (store[to][from] === undefined) {
      store[to][from] = 0;
    }

    var existingDebt;

    if(store[to][from] > 0) {
      // If {to} already owes {from} some coffee, then decrement their count instead of adding a new one
      store[to][from]--;
      existingDebt = true;
    } else {
      // add 1 coffee credit to purchaser's (from) transaction record with recipient (to)
      store[from][to]++;
      existingDebt = false;
    }

    // add transaction to log
    var log = new Date().toString() + ": " + from + " to " + to + ". now: " + store[from][to] + "\n";
    fs.appendFileSync(logFile, log);
    writeData(store);

    if (irc) {
      loqi.update(from, to, existingDebt);
    }

    response.write(JSON.stringify(store));
  } else {
    response.write(JSON.stringify({"error": "need a 'from' and a 'to'"}));
  }

  response.end();
}

function peopleRoute(request, response) {
  response.setHeader('Content-Type', 'application/json');
  // var people = [];
  // for (var i = 0; i < config.people.length; i++) {
  //   people.push(config.people[i].name);
  // }
  response.write(JSON.stringify(config.people));
  response.end();
}

// This function searches for one person to simplify 1 coffee debt.
// Returns false if none could be found.
function simplify() {

  // Look for the first person who both owes and is owed coffee
  var found = false;
  for(var i in config.people) {
    var person = config.people[i].name.toLowerCase();

    // Find out if this person owes anything
    var owesCount = 0;
    for(var owed in store) {
      if(store[owed][person] > 0) {
        owesCount += store[owed][person];
      }
    }

    // Find out if this person is owed anything
    var isOwedCount = 0;
    for(var owes in store[person]) {
      if(store[person][owes] > 0) {
        isOwedCount += store[person][owes];
      }
    }

    if(owesCount > 0 && isOwedCount > 0) {

      // Pick one person who owes this person and one who is owed by this person

      var inPerson = false;
      var outPerson = false;

      for(var owes in store[person]) {
        if(inPerson == false && store[person][owes] > 0) {
          inPerson = owes;
        }
      }
      for(var owed in store) {
        if(outPerson == false && store[owed][person] > 0) {
          outPerson = owed;
        }
      }

      console.log("Found "+inPerson+" owes "+person+", and "+person+" owes "+outPerson);
      console.log("Simplifying to "+inPerson+" owes "+outPerson);

      // Adjust the debt accordingly
      store[person][inPerson]--;
      store[outPerson][person]--;
      store[outPerson][inPerson]++;

      // recurse!
      return simplify();
    }
  }

  // Save to disk
  writeData(store);
  return false;
}

// Simplify the debt graph by looking for
function simplifyRoute(request, response) {
  response.setHeader('Content-Type', 'application/json');

  console.log("Simplifying graph...");
  simplify();
  console.log("Complete!");

  response.write(JSON.stringify(store));
  response.end();
}

function wantsRoute(request, response) {
    response.setHeader('Content-Type', 'application/json');
    wants.list(function(wantList) {
        response.write(JSON.stringify(wantList));
        response.end();
    });
}

// server settings

var redirects = [
  {
    path: "^/$",
    url:  "/index.html"
  },
  {
    path: "^/m(/)?$",
    url:  "/m/index.html"
  }
];

appServer.addRoute(".+", appServer.plugins.redirect, { section: "pre", routes: redirects });

appServer.addRoute(".+", appServer.plugins.filehandler, { basedir: "./htdocs" });
appServer.addRoute("/score$", scoreRoute);
appServer.addRoute("/score\.atom", atomRoute);
appServer.addRoute("/wants", wantsRoute);
appServer.addRoute("/coffee", modifyRoute);
appServer.addRoute("/people", peopleRoute);
appServer.addRoute("/simplify", simplifyRoute);
appServer.addRoute(".+", appServer.plugins.fourohfour);

appServer.addEventHandler('route.fatal', function (error) { console.log("FATAL: " + error); console.dir(error); });
appServer.addEventHandler('run.fatal', function (error) { console.log("FATAL: " + error); console.dir(error); });

// start web server
var server = appServer.createServer();
server.listen(config.listen);
