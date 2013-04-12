process.chdir(__dirname);

// server dependencies
var bricks     = require('bricks'),
    fs         = require('fs'),
    url        = require('url'),
    XMLWriter  = require('xml-writer'),
    ATOMWriter = require('atom-writer'),
    request    = require('request');

var config;

// check for IRC bot
var irc = fs.existsSync('../../bot.json');

if (irc) {
  var api        = require('zenircbot-api');
  var bot_config = api.load_config('../../bot.json');
  var zen        = new api.ZenIRCBot(bot_config.redis.host,
                                     bot_config.redis.port,
                                     bot_config.redis.db);

  var sub   = zen.get_redis_client();
  var redis = zen.get_redis_client();

  config = api.load_config('./config.json');
  console.log("IRC Bot Configured");
} else {
  config = require('./config.json');
  console.log("No IRC bot configured");
}

// paths to store and log
var dataStore = "./data/store.json";
var logFile   = "./data/coffee.log";

// set last modified date
var lastModified = new Date();

// sometimes you just gotta capitalize strings
String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

// synchronously write data to json store
function writeData(store) {
  fs.writeFileSync(dataStore, JSON.stringify(store), 'utf8');
  lastModified = new Date();
}

// synchronously read data from json store
function readData() {
  var data  = fs.readFileSync(dataStore, 'utf8'),
      store = {};

  try {
    store = JSON.parse(data);
  } catch (err) {
    console.error("Unable to parse data from store");
  }

  return store;
}

var appServer = new bricks.appserver();

var store = readData();

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
    // If {to} already owes {from} some coffee, then decrement their count instead of adding a new one
    if(store[to][from] > 0) {
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

    if(irc) {
      var msg = "[coffee] " + from.capitalize() + " bought a coffee for " + to.capitalize() + ". ";

      var numCoffeesOwed = 0;
      var numPeopleOwed = 0;
      for(var isOwed in store) {
        for(var ower in store[isOwed]) {
          if(ower == (existingDebt ? from : to)) {
            numCoffeesOwed += store[isOwed][ower];
            if(store[isOwed][ower] > 0) {
              numPeopleOwed += 1;
            }
          }
        }
      }
      if(numCoffeesOwed == 0) {
        msg += (existingDebt ? from : to).capitalize() + " is now coffee-debt free!";
      } else {
        msg += (existingDebt ? from : to).capitalize() + " now owes " + coffeeWord(numCoffeesOwed, 1)
            + " to " + numPeopleOwed + " " + (numPeopleOwed == 1 ? "person" : "people") + ".";
      }
      zen.send_privmsg(config.channel, msg);
    }

    response.write(JSON.stringify(store));
  } else {
    response.write(JSON.stringify({"error": "need a 'from' and a 'to'"}));
  }

  response.end();
}

function atomRoute(request, response) {
  var xwriter = new XMLWriter(true);
  var atom = new ATOMWriter(xwriter);

  var data = [];
  for(var y in store) {
    for(var x in store[y]) {
      if(store[y][x] > 0) {
        data.push(x.capitalize()+" owes "+y.toString().capitalize()+" "+coffeeWord(store[y][x], true));
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
  response.write('<?xml version="1.0" encoding="utf-8"?>'+"\n");
  response.write(atom.writer.toString());
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

// server settings

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
appServer.addRoute("/simplify", simplifyRoute);
appServer.addRoute(".+", appServer.plugins.fourohfour);

appServer.addEventHandler('route.fatal', function (error) { console.log("FATAL: " + error); console.dir(error); });
appServer.addEventHandler('run.fatal', function (error) { console.log("FATAL: " + error); console.dir(error); });

// start web server
var server = appServer.createServer();
server.listen(config.listen);

// If an IRC environment exists, set up the listener for IRC commands
if(irc) {
  sub.subscribe('in');
  sub.on('message', function(channel, message) {
    var msg = JSON.parse(message);
    var sender = msg.data.sender;
    if(msg.version == 1 && msg.data.message) {
      var names = [];
      for(var i in config.people) {
        names.push(config.people[i].name.toLowerCase());
      }
      if(match=msg.data.message.match(/^!coffee ([a-z]+)$/, 'i')) {
        console.log("Name: " + match[1]);
        var who = match[1];

        if(names.indexOf(who) == -1) {
          zen.send_privmsg(config.channel, "Sorry, I don't know who that is. Try first names only.");
        } else {
          var is_owed = [];
          var owes = [];
          for(var y in store) {
            if(store[y][who] > 0) {
              owes.push(y.capitalize()+" "+coffeeWord(store[y][who], true));
            }
          }
          for(var x in store[who]) {
            if(store[who][x] > 0) {
              is_owed.push(x.capitalize()+" owes "+who.capitalize()+" "+coffeeWord(store[who][x], true));
            }
          }
          var sentence = "";
          if(is_owed.length > 0) {
            sentence += is_owed.join(", ") + ". ";
          }
          if(owes.length > 0) {
            sentence += who.capitalize() + " owes " + owes.join(", ") + ". ";
          }
          zen.send_privmsg(config.channel, sentence);
        }
        
      } else if((match=msg.data.message.match(/^([a-z]+) bought (a|1) coffees? for ([a-z]+)$/))
        || (match=msg.data.message.match(/^([a-z]+) bought ([a-z]+) (a|1) coffees?$/))) {

        var coffee_from;
        var coffee_to;
        var coffee_num;
        if(match[2].match(/^(a|[0-9])$/)) {
          coffee_from = match[1].toLowerCase();
          coffee_to = match[3].toLowerCase();
          coffee_num = match[2];
        } else {
          coffee_from = match[1].toLowerCase();
          coffee_to = match[2].toLowerCase();
          coffee_num = match[3];
        }
        if(coffee_num == "a") {
          coffee_num = 1;
        }

        console.log("IRC Message: from: " + coffee_from + " to: " + coffee_to + " num: " + coffee_num);

        if(names.indexOf(coffee_from) != -1 
          && names.indexOf(coffee_to) != -1 
          && coffee_from != coffee_to) {

          request({
            url: 'http://127.0.0.1:'+config.listen+'/coffee',
            method: 'get',
            qs: {
              from: coffee_from,
              to: coffee_to,
              num: coffee_num
            }
          }, function(error, response, body){
            // cool
          });

        } else {
          zen.send_privmsg(config.channel, "Try 'aaron bought jerry a coffee' (first names only!)");
        }
        
      }
    }
  });
}

function coffeeWord(num, includeNum) {
  if(includeNum) {
    if(num == 1) {
      return "one coffee";
    } else {
      return num + " coffees";
    }
  } else {
    if(num == 1) {
      return "coffee";
    } else {
      return "coffees";
    }
  }
}

