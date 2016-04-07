var mongoose = require('./db').mongoose;
var generatePassword = require("password-maker");
var Client = mongoose.model('Client');
var promise = require('./utils').promise;
var validate = require('./validator').validate;
var handleMissingKeys = require('./validator').handleMissingKeys;

var User = require('./handlers.user').actions;

function handleError(err) {
    console.log('CLIENT:HANDLING-ERROR');
    return {
        message: "Server error",
        detail: err
    };
}

function exists(_id) {
    return promise(function(resolve, error) {
        if (_id) {
            Client.find({
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
    console.log('CLIENT:SAVE:VALIDATING');
    validate(data, ['email']).error(function(keys) {
        console.log('CLIENT:SAVE:VALIDATING:FAIL');
        return handleMissingKeys(keys, callback);
    }).then(_check);

    function _check() {
        console.log('CLIENT:SAVE:CHECK');
        exists(data._id).then(_save).error(function() {

            //find userAsociated
console.log('CLIENT:SAVE:CHECK:USER-EXISTS');
            User.find({email:data.email},function(res){
                if(res.result.length > 0){
                    console.log('CLIENT:SAVE:CHECK:USER-EXISTS:TRUE');
                    data.userId = res.result[0]._id;
                    _save(undefined);
                }else{
                    console.log('CLIENT:SAVE:CHECK:USER-EXISTS:FALSE');
                    _saveAsociatedUser();
                }
            });

            function _saveAsociatedUser(){
                //save an user first
                console.log('CLIENT:SAVE:CHECK:USER-SAVING');
                User.save({email:data.email,type:'client'},function(res){
                    if(res.ok){
                        console.log('CLIENT:SAVE:CHECK:USER-SAVING:SUCCESS');
                        data.userId = res.result._id;
                        _save(undefined);
                    }else{
                        console.log('CLIENT:SAVE:CHECK:USER-SAVING:FAIL');
                        return callback(res);
                    }
                });
            }

            
        });
    }

    function _save(instance) {
        instance = instance || new Client(data);
        instance.type = data.type || instance.type;
        instance.address = data.address || instance.address;
        instance.tel = data.tel || instance.tel;
        instance.siret = data.siret || instance.siret;
        instance.discount = data.discount || instance.discount;
        instance.email = data.email || null;
        instance.userId = data.userId || null;
        //instance.password = data.password || generatePassword(8);
        console.log('CLIENT:SAVE:SAVING');
        instance.save(function(err, instance) {
            if (err) return callback(handleError(err));
            console.log('CLIENT:SAVE:SAVING:SUCCESS');
            callback({
                ok:true,
                message: 'Save success',
                result: instance
            });
        });
    }
}

function getAll(callback) {
    Client.find(function(err, r) {
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
        console.log('CLIENT:REMOVE:VALIDATING:FAIL');
        return handleMissingKeys(keys, callback);
    }).then(_remove);

    function _remove() {
        console.log('CLIENT:REMOVE:BEGIN');
        Client.remove({
            _id: {
                $eq: data._id
            }
        }, function(err) {
            if (err) return callback(handleError(err));
            console.log('CLIENT:REMOVE:SUCCESS');
            callback({ok:true,message:'Client deleted',result:null});
        });
    }
}

function get(data, callback) {
    validate(data, ['_id']).error(function(keys) {
        console.log('CLIENT:GET:VALIDATING:FAIL');
        return handleMissingKeys(keys, callback);
    }).then(_get);

    function _get() {
        Client.find({
            _id: {
                $eq: data._id
            }
        }, function(err, r) {
            if (err) return handleError(err);
            if (r && r.length >= 1) {
                callback({
                    ok:true,
                    message: 'Retrieved success',
                    result: r[0]
                });
            } else {
                callback({
                    ok:false,
                    message: 'Retrieved failed. Item not found.',
                    result: null
                });
            }

        });
    }
}


function removeAll(data, callback) {
    validate(data, ['ids']).error(function(keys) {
        console.log('CLIENT:REMOVE-ALL:VALIDATING:FAIL');
        return handleMissingKeys(keys, callback);
    }).then(_removeAll);

    function _removeAll() {
        console.log('CLIENT:REMOVE-ALL:BEGIN');
        Client.remove({
            _id: {
                $all: data.ids
            }
        }, function(err) {
            if (err) return callback(handleError(err));
            console.log('CLIENT:REMOVE-ALL:SUCCESS');
            callback({ok:true,message:'Clients deleted',result:null});
        });
    }
}

exports.actions = {
    getAll: getAll,
    save: save,
    remove: remove,
    removeAll:removeAll
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
