var config = require('./config.json');
var redisLib = require('redis');
this.redis = redisLib.createClient(
    config.redis.port,
    config.redis.host,
    { selected_db: config.redis.db }
);

exports.get = function(nick, callback) {
    var name = this.getNameFromNick(nick);
    if (name) {
        this.getName(this.getNameFromNick(nick), callback);
    } else {
        callback(null, null);
    }
};

exports.getName = function(name, callback) {
    this.redis.get(name, function(err, val) {
        if (val) {
            try {
                val = JSON.parse(val);
            } catch (e) {
                val = null;
            }
        }
        callback(err, val);
    });
};

exports.list = function(callback) {
    var people = config.people.map(function(el) {
        return el.name.toLowerCase();
    });
    this.redis.mget(people, function(err, wantList) {
        callback(wantList.filter(function(el) {
            return el != null;
        }).map(function(el) {
            return JSON.parse(el)
        }).sort(function(a, b) {
            return b.date - a.date;
        }));
    });
};

exports.delNick = function(nick) {
    this.del(this.getNameFromNick(nick));
};

exports.del = function(name) {
    this.redis.del(name.toLowerCase());
};

exports.create = function(nick, message) {
    var name = this.getNameFromNick(nick);
    var val = {
        'message': message,
        'date': Date.now(),
        'sender': name
    };
    if (name) {
        val.found = true;
        this.redis.setex(name, config.requestExpiration, JSON.stringify(val));
    }
    return val;
};

exports.getNameFromNick = function(nick) {
    for (var i in config.people) {
        var person = config.people[i];
        if (person.nicks.indexOf(nick.toLowerCase().replace(/[\|_].*$/, "")) >= 0) {
            return person.name.toLowerCase();
        }
    }
};

exports.getNickFromName = function(name) {
    for (var i in config.people) {
        var person = config.people[i];
        if (person.name.toLowerCase() === name.toLowerCase()) {
            return person.nicks[0].toLowerCase();
        }
    }
};

