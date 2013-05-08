var fs = require('fs');
var data = require('./data');
var coffeeConfig = require('./config.json');
require('date-utils');
var wants = require('./wants');

// sometimes you just gotta capitalize strings
String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

var api        = require('zenircbot-api');
var bot_config = api.load_config(coffeeConfig.botConfigPath);
var zen        = new api.ZenIRCBot(bot_config.redis.host,
                                   bot_config.redis.port,
                                   bot_config.redis.db);

var sub   = zen.get_redis_client();
var redis = zen.get_redis_client();
wants.setRedis(redis);

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
    } else if (match=msg.data.message.match(/^!wants?list$/)) {
        wants.list(function(wantList) {
            wantList.forEach(function(el) {
                var nick = wants.getNickFromName(el.sender);
                var responses = [
                    nick + " wants '" + el.message + "'.",
                    nick + " would like '" + el.message + "'.",
                    nick + " is in need of '" + el.message + "'.",
                    "Somebody get " + nick + " '" + el.message + "', stat!"
                ];
                zen.send_privmsg(config.channel, responses[Math.floor(Math.random() * responses.length)]);
            });
        });
    } else if (match=msg.data.message.match(/^!(un)?wants? ?(.*$)/, 'i')) {
        // this is a command that has started with !want or !unwant

        if (match.length > 1 && (match[1] === 'un' || (match[2] !== '' && match[2] !== ' '))) {
            // This is either a !unwant or a !want command with a parameter, determine if we are creating or deleting

            if (match[2].toLowerCase() === 'cancel' || match[2].toLowerCase() === 'nevermind' || match[1] === 'un') {
                // Cancel the request on !unwant, !want cancel, and !want nevermind

                wants.get(sender, function(err, val) {
                    var response = [];
                    if (val && val.message) {
                        wants.delNick(sender);
                        responses = ["Your want has been cancelled.", "No coffee for you!", "no '" + val.message + "' for you!", "Ba-leted.",
                            "removed", "cancelled", "neverminded.", "you're gonna regret that."];
                    } else {
                        responses = ["Ok, I didn't have any wants for you anyway.", "You didn't have any wants out."];
                    }
                    zen.send_privmsg(config.channel, responses[Math.floor(Math.random() * responses.length)]);
                });
            } else {
                // We've received an add want command (!want a sammich) add it to redis with an expiration date

                var want = wants.create(sender, match[2]);
                var responses = [];
                if (want.found) {
                    responses = ["Got it!", "Yum!", "ooo, get me one too!", "Okay!", "comin' right up ... I hope.", "mmmm... " + want.message];
                } else {
                    responses = ["I don't have an account for " + sender, sender + ": no can do. You need to get your nick added to the configs.", "I don't know anybody with the nick '" + sender + "'."];
                }
                zen.send_privmsg(config.channel, responses[Math.floor(Math.random() * responses.length)]);
            }
        } else {
            // This is a !want command with no parameters, meaning a status update command.

            wants.get(sender, function(err, val) {
                if (err) {
                    zen.send_privmsg(config.channel, "Ack! Something went horribly awry!");
                    console.log(err);
                    return;
                }
                var responses = [];
                if (val) {
                    // found one!
                    var requestedAt = new Date(val.date);
                    var now = new Date();
                    var minutes = requestedAt.getMinutesBetween(now);
                    var seconds = requestedAt.getSecondsBetween(now.clone().addMinutes(-minutes));
                    var waitString = getTimeString(minutes, seconds);

                    var exp = requestedAt.clone().addSeconds(coffeeConfig.requestExpiration);
                    var expMinutes = now.getMinutesBetween(exp);
                    var expSeconds = now.getSecondsBetween(exp.clone().addMinutes(-expMinutes));
                    var expString = getTimeString(expMinutes, expSeconds);

                    console.log(val);
                    responses = [
                        sender + ": by my calculations you've been waiting for '" + val.message + "' for " + waitString + ". I'll be removing it in " + expString + ".",
                        sender + ": you've been waiting for '" + val.message + "' for " + waitString + ". I'll be cancelling it for you in " + expString + ".",
                        sender + ": you wanted '" + val.message + "' " + waitString + " ago. It's got " + expString + " left before I remove it.",
                        sender + ": I've got you down for '" + val.message + "' " + waitString + " ago. If nobody buys it for you in the next " + expString + "; you're SOL."
                    ];
                } else {
                    // no want found for this user
                    responses = [
                        sender + ": I've got 99 problems but a want for you ain't one.",
                        sender + ": no wants for you!",
                        sender + ": what do you want?!",
                        sender + ": you appear to want of nothing.",
                        "I have no wants for you, " + sender,
                        "I'm sorry, " + sender + ", but I don't see any wants for you, perhaps you should re-!want your request."
                    ];
                }
                zen.send_privmsg(config.channel, responses[Math.floor(Math.random() * responses.length)]);
            });
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

function getTimeString(minutes, seconds) {
    var retString = '';
    if (minutes === 1) {
        retString = "1 minute";
    } else if (minutes > 1) {
        retString = minutes + " minutes";
    }
    if (minutes > 0 && seconds > 0) {
        retString += " and ";
    }
    if (seconds === 1) {
        retString += "1 second";
    } else if (seconds > 1) {
        retString += seconds + " seconds";
    }
    return retString;
}
