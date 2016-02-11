var mongoose = require('./db').mongoose;
var generatePassword = require("password-maker");
var User = mongoose.model('User');
var promise = require('./utils').promise;
var validate = require('./validator').validate;
var handleMissingKeys = require('./validator').handleMissingKeys;


function handleError(err) {
    console.log('USER:HANDLING-ERROR');
    return {
        message: "Server error",
        detail: err
    };
}

function exists(_id) {
    return promise(function(resolve, error) {
        if (_id) {
            User.find({
                _id: {
                    $eq: _id
                }
            }, function(err, r) {
                if (r && r.length >= 1) {
                    resolve(r[0]);
                } else {
                    error();
                }
            });
        } else {
            error();
        }
    });
}



function save(data, callback) {
    console.log('USER:SAVE:VALIDATING');
    validate(data, ['email']).error(function(keys) {
        console.log('USER:SAVE:VALIDATING:FAIL');
        return handleMissingKeys(keys, callback);
    }).then(_check);

    function _check() {
        console.log('USER:SAVE:CHECK');
        exists(data._id).then(_save).error(function() {
            _save(undefined);
        });
    }

    function _save(instance) {
        instance = instance || new User(data);
        instance.type = data.type || instance.type || 'client';
        instance.email = data.email || null;
        instance.password = data.password || generatePassword(8);
        console.log('USER:SAVE:SAVING');
        instance.save(function(err, instance) {
            if (err) return callback(handleError(err));
            console.log('USER:SAVE:SAVING:SUCCESS');
            callback({
                ok:true,
                message: 'Save success',
                result: instance
            });
        });
    }
}

function getAll(callback) {
    User.find(function(err, r) {
        if (err) return callback(handleError(err));
        if (r && r.length >= 1) {
            callback({
                message: 'Retrieved success',
                result: r
            });
        } else {
            callback({
                message: 'Retrieved failed. Item not found.',
                result: []
            });
        }
    });
}


function remove(data, callback) {
    validate(data, ['_id']).error(function(keys) {
        console.log('USER:REMOVE:VALIDATING:FAIL');
        return handleMissingKeys(keys, callback);
    }).then(_remove);

    function _remove() {
        console.log('USER:REMOVE:BEGIN');
        User.remove({
            _id: {
                $eq: data._id
            }
        }, function(err) {
            if (err) return callback(handleError(err));
            console.log('USER:REMOVE:SUCCESS');
            callback({
                ok: true,
                message: 'User deleted',
                result: null
            });
        });
    }
}

function get(data, callback) {
    validate(data, ['_id']).error(function(keys) {
        console.log('USER:GET:VALIDATING:FAIL');
        return handleMissingKeys(keys, callback);
    }).then(_get);

    function _get() {
        User.find({
            _id: {
                $eq: data._id
            }
        }, function(err, r) {
            if (err) return handleError(err);
            if (r && r.length >= 1) {
                callback({
                    ok: true,
                    message: 'Retrieved success',
                    result: r[0]
                });
            } else {
                callback({
                    ok: false,
                    message: 'Retrieved failed. Item not found.',
                    result: null
                });
            }

        });
    }
}


function removeAll(data, callback) {
    validate(data, ['ids']).error(function(keys) {
        console.log('USER:REMOVE-ALL:VALIDATING:FAIL');
        return handleMissingKeys(keys, callback);
    }).then(_removeAll);

    function _removeAll() {
        console.log('USER:REMOVE-ALL:BEGIN');
        User.remove({
            _id: {
                $all: data.ids
            }
        }, function(err) {
            if (err) return callback(handleError(err));
            console.log('USER:REMOVE-ALL:SUCCESS');
            callback({
                ok: true,
                message: 'Users deleted',
                result: null
            });
        });
    }
}

function find(data,callback){
    var rules = {};
    for(var x in data){
        rules[x]={$eq:data[x]};
    }
    User.find(rules,function(err,r){
        if (err) return callback(handleError(err));
        return callback({ok:true,message:'Query success',result:r});
    });
}

exports.actions = {
    getAll: getAll,
    save: save,
    remove: remove,
    removeAll: removeAll,
    find:find
};


exports.login = function(req, res) {
    var data = req.body;
    User.find({
        email: {
            $eq: data.email
        },
        password: {
            $eq: data.password
        }
    }, function(err, r) {
        if (err) return res.json(handleError(err));
        var item = r && r.length >= 1 && r[0] || null;
        if (item) {
            res.json({
                ok: true,
                message: "User auth success",
                result: {
                    email: data.email,
                    password: data.password,
                    type : item.type,
                    expire: new Date().getTime() + (1000 * 60) * 120
                }
            });
        } else {
            res.json({
                ok: false,
                message: 'Incorrect login',
                result: {}
            });
        }
    });
};


exports.find = function(req, res) {
    var data = req.body;
    find(data, function(rta) {
        res.json(rta);
    });
};

exports.get = function(req, res) {
    var data = req.body;
    get(data, function(rta) {
        res.json(rta);
    });
};

exports.getAll = function(req, res) {
    getAll(function(rta) {
        res.json(rta);
    });
};

exports.save = function(req, res) {
    var data = req.body;
    save(data, function(result) {
        res.json(result);
    });
};
exports.remove = function(req, res) {
    remove(req.body, function(result) {
        res.json(result);
    });
};
exports.removeAll = function(req, res) {
    removeAll(req.body, function(result) {
        res.json(result);
    });
};
