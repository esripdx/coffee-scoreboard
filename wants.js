var config = require('./config.json');
exports.get = function(nick, callback) {
    this.getName(getNameFromNick(nick), callback);
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
        wantList = wantList.filter(function(el) {
            return el != null;
        });
        callback(wantList.sort(function(a, b) {
            return a.date - b.date;
        }));
    });
};

exports.delNick = function(nick) {
    this.del(getNameFromNick(nick));
};

exports.del = function(name) {
    this.redis.del(name.toLowerCase());
};

exports.create = function(nick, message) {
    var name = getNameFromNick(nick);
    var val = {
        'message': message,
        'date': Date.now(),
        'sender': name
    };
    this.redis.setex(name, config.requestExpiration, JSON.stringify(val));
    return val;
};

exports.setRedis = function(redis) {
    this.redis = redis;
};

function getNameFromNick(nick) {
    for (var i in config.people) {
        var person = config.people[i];
        if (person.nicks.indexOf(nick.toLowerCase()) >= 0) {
            return person.name.toLowerCase();
        }
    }
}

