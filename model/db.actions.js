var mongoose = require('./db').mongoose;
var getModel = require('./db').getModel;
var getSchema = require('./db').getSchema;
var validate = require('./validator').validate;
var promise = require('./utils').promise;


var __hookData = {};
var _hook = function(schemaName, n, cb, data, index) {
    __hookData[schemaName] = __hookData[schemaName] || {}
    var _hooks = __hookData[schemaName];
    _hooks[n] = _hooks[n] || [];
    //
    if (typeof cb == 'function') {
        _hooks[n].push(cb);
        console.log(schemaName, 'HOOK', n, 'added at', _hooks[n].length);
    }
    else {

        if (data && index) {

            var _cb = _hooks[n][index] || undefined;
            if (!_cb) {
                console.log(schemaName, 'HOOK:RTA', JSON.stringify(data));
                return data;
            }
            else {
                console.log(schemaName, 'HOOK', n, 'fire:index:', index, '  total:', _hooks[n].length);
                data = _cb(data);
                return _hook(schemaName, n, null, data, index++);
            }
        }
        else {

            var _data = cb;
            if (_hooks[n][0]) {
                console.log(schemaName, 'HOOK', n, 'fire:index:', 0, '  total:', _hooks[n].length);
                //console.log(schemaName, 'HOOK', n, 'firing', 0);
                _data = _hooks[n][0](_data);
                return _hook(schemaName, n, null, _data, 1);
            }
            else {
                //console.log(schemaName, 'HOOK', n, 'skip');
                return _data;
            }
        }
    }
};




exports.create = function(modelName, m) {
    if (!mongoose) mongoose = m;
    var Model = getModel(modelName);


    if (modelName !== 'File') {
        try {
            Model.findOne({}, () => {});
        }
        catch (e) {
            console.log('DB SCHEMA ERROR', modelName);
        }
    }

    var schema = getSchema(modelName);

    var hook = (a, b, c, d) => {
        return _hook(modelName, a, b, c, d);
    };

    function log(x) {
        console.log(''); //enter
        //
        var args = arguments;
        var msg = '';
        Object.keys(args).forEach((arg, i) => {
            if (msg === '') msg += args[arg].toString().toUpperCase();
            else msg += ", " + args[arg].toString();
        });
        console.log(modelName.toUpperCase() + ': ' + msg);
    }







    function existsById(_id, cb) {
        log('existsById=' + _id);
        Model.count(toRules({
            _id: _id
        }), (err, r) => {
            cb(err, r && r > 0);
        });
    }
    //
    function exists(data, cb) {
        try {
            log('exists=' + JSON.stringify(data));
        }
        catch (e) {
            log('exists=', 'circular-json-error');
        }
        Model.count(toRules(data), (err, r) => {
            log('exists=' + (r && (r > 0) || false));
            cb(err, r && (r > 0) || false);
        });
    }
    //
    function existsByField(name, val, cb) {
        log('existsByField=' + name + ':' + val);
        var data = {};
        data[name] = val;
        Model.count(toRules(data), (err, r) => {
            log('existsByField=' + (r && r > 0));
            cb(err, r && r > 0);
        });
    }
    //
    function createUpdate(data, cb, matchData, requiredKeys) {
        //matchData, requiredKeys: req,res (if is being called directly)
        if (matchData && (matchData.body || matchData.params)) {
            matchData = null;
            requiredKeys = null;
        }

        if (data.__match) {
            matchData = data.__match;
            delete data.__match;
        }

        return promise((then, error, emit) => {
            //
            //log('createUpdate=' + JSON.stringify(data));
            log('createUpdate:start');
            log('createUpdate:requiredKeys=' + JSON.stringify(requiredKeys));
            check(data, requiredKeys || [], (err, r) => {
                if (err) return rta(err, null);
                if (data._id) {
                    data.updatedAt = new Date();
                    var _id = data._id;
                    delete data._id;
                    data = hook('preSave', data);
                    return Model.findOneAndUpdate(toRules({
                        _id: _id
                    }), data).exec((err, r) => {
                        if (err) return rta(err, null);
                        if (!r) return rta(modelName + '= ' + _id + ' do not belong to any item.', null);
                        return rta(err, r);
                    });
                }
                matchData = matchData || {};

                //log('createUpdate:matchData=' + JSON.stringify(requiredKeys));

                if (matchData.length && typeof matchData !== 'string') {
                    //an array of string that represents the fields to match
                    if (matchData.filter(k => data[k] === undefined).length == 0) {
                        var _matchData = {}
                        matchData.map(key => _matchData[key] = data[key]);
                        matchData = _matchData;
                    }
                    else {
                        matchData = {};
                    }
                }

                log('createUpdate:matchData=' + JSON.stringify(matchData));

                if (Object.keys(matchData).length > 0) {
                    console.log('MODEL FROM ', modelName);
                    return Model.findOne(toRules(matchData)).exec((err, r) => {
                        if (err) return rta(err, null);
                        if (r) {
                            log('createUpdate:match:found:updating');
                            for (var x in data) {
                                r[x] = data[x];
                            }
                            data = hook('preSave', data);
                            return r.save((err, r) => {
                                emit('updated', err, r);
                                return rta(err, r);
                            });
                        }
                        else {
                            log('createUpdate:match:not-found:creating');
                            data = hook('preSave', data);
                            _create(data, (err, r) => {
                                if (err) return rta(err, null);
                                emit('created', err, r);
                                return rta(err, r);
                            }, requiredKeys);
                        }
                    })
                }
                else {
                    log('createUpdate:creating', data);
                    data = hook('preSave', data);
                    _create(data, (err, r) => {
                        if (err) return rta(err, null);
                        emit('created', err, r);
                        return rta(err, r);
                    }, requiredKeys);
                }
            });
            //
            function rta(err, r) {
                if (err) {
                    error(err, r);
                    if (cb) return cb(err, r);
                }
                else {
                    then(err, r);
                    //log('createUpdate:rta' + JSON.stringify(r));
                    if (cb) return cb(err, r);
                }
            }
        });

    }

    function populate(query, p) {
        if (p.length) {
            query = query.populate(p[0], p[1]);
        }
        else {
            Object.keys(p).forEach((k) => {
                query = query.populate(k, p[k]);
            });
        }
        return query;
    }

    function getAll(data, cb) {
        log('getAll=' + JSON.stringify(data));
        var query = Model.find(toRules(data))
        if (data.__select) {
            query = query.select(data.__select);
        }
        if (data.__populate) {
            query = populate(query, data.__populate);
        }
        if (data.__sort) {
            query = query.sort(data.__sort);
        }
        query.exec(cb);
    }

    function fillObject(object, data, propName, newPropName) {
        var assignable = {};
        if (data[propName]) {
            assignable[newPropName || propName] = data[propName];
        }
        return Object.assign(object, assignable);
    }

    function paginate(data, cb) {
        log('paginate=' + JSON.stringify(data));
        var options = {};
        options = fillObject(options, data, '__select', 'select');
        options = fillObject(options, data, '__sort', 'sort');
        options = fillObject(options, data, '__lean', 'lean');

        if (data.__populate) {
            var __populate = data.__populate;
            delete data.__populate;
            var arr = [];
            for (var x in __populate) {
                arr.push({
                    path: x,
                    select: __populate[x]
                });
            }
            options.populate = arr;
        }

        options = fillObject(options, data, '__populate', 'populate');
        options = fillObject(options, data, '__offset', 'offset');
        options = fillObject(options, data, '__page', 'page');
        options = fillObject(options, data, '__limit', 'limit');
        //log('paginate:options:typeof:' + (typeof options));
        log('paginate:options=' + JSON.stringify(options));
        Model.paginate(toRules(data), options, function(err, result) {
            if (err) return cb(err, result);
            //log('paginate:result=' + JSON.stringify(result));
            return cb(null, result);
            /*
            docs {Array} - Array of documents
            total {Number} - Total number of documents in collection that match a query
            limit {Number} - Limit that was used
            [page] {Number} - Only if specified or default page/offset values were used
            [pages] {Number} - Only if page specified or default page/offset values were used
            [offset] {Number} - Only if specified or default page/offset values were used
            */
        });
    }

    function remove(data, cb) {
        data = {
            _id: data._id
        };
        log('remove=' + JSON.stringify(data));
        check(data, ['_id'], (err, r) => {
            if (err) return cb(err, null);
            Model.remove(toRules(data)).exec((err, r) => {
                cb(err, r);
            });
        });
    }

    function result(res, options) {
        return function(err, r) {
            var rta = {
                ok: !err,
                message: (err) ? 'Error' : 'Success',
                err: err || null,
                result: (r !== null) ? r : ((r === false) ? false : null)
            };

            //when result contains something like {ok,message,result}
            if (rta.result && rta.result.result) {
                if (rta.result.message) {
                    rta.message = rta.result.message;
                    rta.result = rta.result.result;
                }
            }

            //log('result=', JSON.stringify(rta));
            log('result= ' + (rta.ok == true) + (err ? ' Error: ' + JSON.stringify(err) : ''));
            //
            if (options && options.__res) {
                options.__res(res, rta);
            }
            else {
                res.json(rta);
            }
        };
    }

    function getById(data, cb) {
        log('getById=' + JSON.stringify(data._id));
        check(data, ['_id'], (err, r) => {
            if (err) return cb(err, r);
            var query = Model.findById(data._id)
            if (data.__select) {
                query = query.select(data.__select);
            }
            if (data.__populate) {
                query = populate(query, data.__populate);
            }
            query.exec((err, r) => {
                if (err) return cb(err, r);
                cb(null, r);
            });
        });
    }

    function get(data, cb) {
        log('get=' + JSON.stringify(data));
        //check(data, ['_id'], (err, r) => {
        //  if (err) return cb(err, r);
        var query = Model.findOne(toRules(data))
        if (data.__select) {
            query = query.select(data.__select);
        }
        if (data.__populate) {
            query = populate(query, data.__populate);
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

    function removeWhen(data, cb) {
        log('removeWhen=' + JSON.stringify(data));
        Model.remove(toRules(data), (err, r) => {
            if (err) return cb(err, r);
            cb(err, r);
        });
    }

    function removeAll(data, cb, requiredKeys) {
        log('removeAll=' + JSON.stringify(data));
        //check(data, ['ids'], (err, r) => {
        check(data, requiredKeys || ['ids'], (err, r) => {
            if (err) return cb(err, null);
            _removeIds();
        });

        function _removeIds() {
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
    }

    function toRules(data) {
        data = data || {};
        var rules = {};
        for (var x in data) {
            if (x.indexOf('__') !== -1) {
                if (x == '__$where') {
                    for (var k in data[x]) {
                        rules[k] = {
                            $where: data[x][k]
                        };
                    }
                }
                if (x == '__regexp') {
                    for (var k in data[x]) {
                        rules[k] = new RegExp(data[x][k], 'i');
                        log('toRules:exp' + data[x][k]);
                    }
                }
            }
            else {
                rules[x] = {
                    $eq: data[x]
                };
            }
        }
        if (data.__rules) {
            rules = Object.assign(rules, data.__rules);
        }
        log('toRules:' + JSON.stringify(rules));
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

    function update(data, cb) {
        //log('update=' + JSON.stringify(data));
        log('update:start');
        check(data, ['_id'], (err, r) => {
            if (err) return cb && cb(err, null);
            var _id = data._id;
            delete data._id;
            data = hook('preSave', data);
            Model.update({
                _id: _id
            }, data, (err, r) => {
                log('update:ok=' + !err + ' ' + JSON.stringify(err));
                if (!cb) return;
                if (err) return cb(err, null);
                log('update:rta=' + JSON.stringify(r));
                return cb(null, r);
            });
        });
    }

    function getPaths(data, cb) {
        cb(null, schema.paths);
    }

    var RTA = {
        getPaths:getPaths,
        schema: schema,
        model: Model,
        _hook: hook,
        paginate: paginate,
        existsById: existsById,
        existsByField: existsByField,
        exists: exists,
        createUpdate: createUpdate,
        save: createUpdate,
        create: _create,
        getAll: getAll,
        update: update,
        remove: remove,
        removeWhen: removeWhen,
        result: result,
        get: get,
        getById: getById,
        check: check,
        removeAll: removeAll,
        toRules: toRules,
        find: find,
        create: _create,
        log: log
    };
    return RTA;
};
