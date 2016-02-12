var mongoose = require('./db').mongoose;
var generatePassword = require("password-maker");
var Diag = mongoose.model('Diag');
var promise = require('./utils').promise;
var validate = require('./validator').validate;
var handleMissingKeys = require('./validator').handleMissingKeys;


function handleError(err) {
    console.log('DIAG:HANDLING-ERROR');
    return {
        message: "Server error",
        detail: err
    };
}

function exists(_id) {
    return promise(function(resolve, error) {
        if (_id) {
            Diag.find({
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
    console.log('DIAG:SAVE:VALIDATING');
    validate(data, ['email']).error(function(keys) {
        console.log('DIAG:SAVE:VALIDATING:FAIL');
        return handleMissingKeys(keys, callback);
    }).then(_check);

    function _check() {
        console.log('DIAG:SAVE:CHECK');
        exists(data._id).then(_save).error(function() {
            _save(undefined);
        });
    }

    function _save(instance) {
        instance = instance || new Diag(data);
        for (var x in data) {
            instance[x] = data[x];
        }
        console.log('DIAG:SAVE:SAVING');
        instance.save(function(err, instance) {
            if (err) return callback(handleError(err));
            console.log('DIAG:SAVE:SAVING:SUCCESS');
            callback({
                message: 'Save success',
                result: instance
            });
        });
    }
}

function getAll(data, callback) {
    var rules = {};
    for (var x in data) {
        rules[x] = {
            $eq: data[x]
        };
    }
    Diag.find(rules)
    .populate( '_user', 'email')
    .exec((err, r) => {
        callback({ ok: !err, err: err, message: r.length + " Object/s", result: r });
    });    
}


function remove(data, callback) {
    validate(data, ['_id']).error(function(keys) {
        console.log('DIAG:REMOVE:VALIDATING:FAIL');
        return handleMissingKeys(keys, callback);
    }).then(_remove);

    function _remove() {
        console.log('DIAG:REMOVE:BEGIN');
        Diag.remove({
            _id: {
                $eq: data._id
            }
        }, function(err) {
            if (err) return callback(handleError(err));
            console.log('DIAG:REMOVE:SUCCESS');
            callback({
                ok: true,
                message: 'Diag deleted',
                result: null
            });
        });
    }
}

function get(data, callback) {
    validate(data, ['_id']).error(function(keys) {
        console.log('DIAG:GET:VALIDATING:FAIL');
        return handleMissingKeys(keys, callback);
    }).then(_get);

    function _get() {
        Diag.find({
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
        console.log('DIAG:REMOVE-ALL:VALIDATING:FAIL');
        return handleMissingKeys(keys, callback);
    }).then(_removeAll);

    function _removeAll() {
        console.log('DIAG:REMOVE-ALL:BEGIN');
        Diag.remove({
            _id: {
                $all: data.ids
            }
        }, function(err) {
            if (err) return callback(handleError(err));
            console.log('DIAG:REMOVE-ALL:SUCCESS');
            callback({
                ok: true,
                message: 'Diags deleted',
                result: null
            });
        });
    }
}

function find(data, callback) {
    var rules = {};
    for (var x in data) {
        rules[x] = {
            $eq: data[x]
        };
    }
    Diag.find(rules, function(err, r) {
        if (err) return callback(handleError(err));
        return callback({
            ok: true,
            message: 'Query success',
            result: r
        });
    });
}

exports.actions = {
    getAll: getAll,
    save: save,
    remove: remove,
    removeAll: removeAll,
    find: find
};


exports.login = function(req, res) {
    var data = req.body;
    Diag.find({
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
                message: "Diag auth success",
                result: {
                    email: data.email,
                    password: data.password,
                    type: item.type,
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
    getAll(req.body | {}, function(rta) {
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
