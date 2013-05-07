var config = require('./config.json');
exports.get = function(name, callback) {
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

exports.del = function(name) {
    this.redis.del(name);
};

exports.create = function(name, message) {
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

