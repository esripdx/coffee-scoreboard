var fs = require('fs');
var data = require('./data');

// sometimes you just gotta capitalize strings
String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

var api        = require('zenircbot-api');
var bot_config = api.load_config('../../bot.json');
var zen        = new api.ZenIRCBot(bot_config.redis.host,
                                   bot_config.redis.port,
                                   bot_config.redis.db);

var sub   = zen.get_redis_client();
var redis = zen.get_redis_client();

var config = api.load_config('./config.json');
console.log("IRC Bot Configured");

// set up the listener for IRC commands
sub.subscribe('in');
sub.on('message', function(channel, message) {
  var store = data.read();
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

exports.update = function(from, to, existingDebt) {
  var store = data.read();
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
