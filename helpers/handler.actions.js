var mongoose = require('./db').mongoose;
var validate = require('./validator').validate;

exports.create = function(modelName) {
    var Model = mongoose.model(modelName);
    //
    function log(msg) {
        console.log(modelName.toUpperCase() + ': ' + msg);
    }

    function existsById(_id, cb) {
        log('existsById=' + id);
        Model.count(toRules({
            _id: _id
        }), (err, r) => {
            cb(err, r && r > 0);
        });
    }

    function existsByField(name, val, cb) {
        log('existsByField=' + name + ':' + val);
        var data = {};
        data[name] = val;
        Model.count(toRules(data), (err, r) => {
            log('existsByField=' + (r && r>0));
            cb(err, r && r > 0);
        });
    }
    //
    function createUpdate(data, cb, matchData,requiredKeys) {
        log('save=' + JSON.stringify(data));
        check(data, requiredKeys || [], (err, r) => {
            if (err) return cb(err, null);
            if (data._id) {
                data.updatedAt = new Date();
                var _id = data._id;
                delete data._id;
                return Model.findByIdAndUpdate(_id, data).exec(cb);
            }
            matchData  = matchData || {};
            if (Object.keys(matchData).length>0) {
                return Model.findOne(toRules(matchData)).exec((err, r) => {
                    if (err) return cb(err, null);
                    if (r) {
                        for (var x in data) {
                            r[x] = data[x];
                        }
                        return r.save(cb);
                    } else {
                        _create(data, cb,requiredKeys);
                    }
                })
            } else {
                _create(data, cb,requiredKeys);
            }
        });
    }

    function getAll(data, cb) {
        log('getAll=' + JSON.stringify(data));
        var query = Model.find(toRules(data))
        if(data.__populate){
            query = query.populate(data.__populate[0],data.__populate[1]);
        }
        query.exec(cb);
    }

    function remove(data, cb) {
        log('remove=' + JSON.stringify(data));
        check(data, ['_id'], (err, r) => {
            if (err) return cb(err, null);
            Model.remove(toRules(data)).exec((err, r) => {
                cb(err, r);
            });
        });
    }

    function result(res) {
        return function(err, r) {
            var result = {
                ok: !err,
                message: (err) ? 'Error' : 'Success',
                err: err || null,
                result: r || null
            };
            log('result=' + JSON.stringify(result));
            res.json(result);
        };
    }

    function get(data, cb) {
        log('get=' + JSON.stringify(data));
        //check(data, ['_id'], (err, r) => {
        //  if (err) return cb(err, r);
        var query = Model.findOne(toRules(data))
        if(data.__populate){
            query = query.populate(data.__populate[0],data.__populate[1]);
        }
        query.exec((err, r) => {
            if (err) return cb(err, r);
            cb(null, r);
        });
        //});
    }

    function check(data, fields, cb) {
        validate(data, fields).error(function(keys) {
            log('check:fail=' + JSON.stringify(data) + ' Keys=' + JSON.stringify(keys));
            cb('Keys required: ' + JSON.stringify(keys), null);
        }).then(() => {
            cb(null, true);
        });
    }



    function removeAll(data, cb, requiredKeys) {
        log('removeAll=' + JSON.stringify(data));
        //check(data, ['ids'], (err, r) => {
        check(data, requiredKeys || [], (err, r) => {
            if (err) {
                cb(err, null);
            } else {
                data = data || {};
                var rules = data.ids ? {
                    _id: {
                        $all: data.ids
                    }
                } : {};
                Model.remove(rules, (err, r) => {
                    if (err) return cb(err, r);
                    cb(err, r);
                });
            }
        });
    }

    function toRules(data) {
        data = data || {};
        var rules = {};
        for (var x in data) {
            if(x.indexOf('__')!==-1){
                continue; //__ represents a special command.
            }
            rules[x] = {
                $eq: data[x]
            };
        }
        return rules;
    }


    function find(data, cb) {
        log('find=' + JSON.stringify(data));
        Model.find(toRules(data)).exec(cb);
    }


    function _create(data, cb, requiredKeys) {
        log('create=' + JSON.stringify(data));
        check(data, requiredKeys || [], (err, r) => {
            if (err) return cb(err, null);
            return Model.create(data, cb);
        });
    }
    return {
        existsById: existsById,
        existsByField: existsByField,
        createUpdate: createUpdate,
        getAll: getAll,
        remove: remove,
        result: result,
        get: get,
        check: check,
        removeAll: removeAll,
        toRules: toRules,
        find: find,
        create: _create,
        log: log
    };
};
