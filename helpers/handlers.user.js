var mongoose = require('./db').mongoose;
var generatePassword = require("password-maker");
var User = mongoose.model('User');
var promise = require('./utils').promise;
var validate = require('./validator').validate;
var handleMissingKeys = require('./validator').handleMissingKeys;
var actions = require('./handler.actions').create('User');
var Order = require('./handler.actions').create('Order');
var Balance = require('./handler.actions').create('Balance');
var BalanceItem = require('./handler.actions').create('BalanceItem');
var email = require('./handlers.email').actions;
var _ = require('lodash');
var moment = require('moment');


//User.methods.name = ()=>{return };

function balance(data, cb) {
    data.period = data.period || 'year';
    actions.log('balance=' + JSON.stringify(data));
    data._calculate = data._calculate && data._calculate.toString() == 'true' || false;
    if (!data._id) return cb("_id required");
    if (data._calculate) {
        _calculate(null, null, true);
    } else {
        _retrieve();
    }

    //
    function _calculate(err, _user, firstTime) {
        if (!_user && firstTime == true) return actions.model.findById(data._id, _calculate);
        if (!_user) return cb("balance:calculate=User not found:" + data._id);
        //
        if (_user.userType == 'admin') {
            return cb('Admin balance unsupported');
        }
        //
        actions.log('balance:_calculate');
        var balanceKeys = ['_user', 'amount'];
        var balanceMatch = ['_user'];
        var balanceItemKeys = ['_user', '_order', 'pending', 'amount', 'description'];
        var balanceItemMatch = ['_user', '_order'];
        //
        Balance.createUpdate({ _user: _user._id, amount: 0 }, (err, bal) => {
            if (err) return cb(err);
            actions.log('balance:_calculate:creteUpdate:rta', JSON.stringify(bal));
            BalanceItem.removeAll({
                _user: _user._id
            }, (err, rr) => {
                if (err) return cb(err);
                bal.items = [];
                _calculateBalance(null, bal);
            });
        }, balanceMatch, balanceKeys);
        //
        function _calculateBalance(err, _balance) {
            actions.log('balance:_calculateBalance', JSON.stringify(_balance));
            if (err) return cb(err, _balance);
            if (!_balance) return cb('balance:create:error');
            //
            //remove prev balance items

            //
            Order.getAll(_orderRules(), (err, _orders) => {
                actions.log('balance:_calculateBalance:orders=', _orders.length);
                if (err) return cb(err, _orders);

                if (!_orders || _orders.length == 0) {
                    _balance.amount = 0;
                    _balance.save((err, r) => {
                        _retrieve();
                    });
                } else {
                    balanceAmount = 0;
                    var _stackSaving = [];
                    var exit = false;
                    _orders.forEach(_order => {

                        //validate period
                        var now = moment();
                        if (!now.isSame(moment(_order.diagStart), data.period)) {
                            actions.log('balance:_calculateBalance:excluding order=' + _order._id);
                            return; // exclude  
                        }

                        _stackSaving.push(_order._id);
                        var d = {};
                        d.pending = !_.includes(['prepaid', 'completed'], _order.status);
                        d.description = _order.address + ' (' + moment(_order.diagStart).format('DD-MM-YY') + ', ' + moment(_order.diagStart).format('HH:mm') + ' - ' + moment(_order.diagEnd).format('HH:mm') + ')';
                        d.amount = _order.price;
                        //diag
                        //-_user.diagWebsiteComission (admin decide it) (-)
                        //-_order.fastDiagComm (+)
                        if (_user.userType == 'diag') {
                            var diagWebsiteComission = ((_order.price * _user.comission) / 100) * -1;
                            
                            d.amount = _order.price + diagWebsiteComission;

                            var fastDiagComm = (d.amount * _order.fastDiagComm) / 100;
                            d.amount+= fastDiagComm;
                        }
                        //admin
                        //-diag price (-)
                        //-client disccount (-)
                        //-stripe % (-)
                        if (_user.userType == 'admin') {
                            cb('Admin balance unsupported');
                            exit = true;
                            return false;
                        }
                        //client
                        //just the order price
                        d._order = _order._id;
                        d._user = _user._id;
                        //
                        balanceAmount += d.amount;
                        BalanceItem.createUpdate(d, (err, _balanceItem) => {
                            _stackSaving = _stackSaving.slice(1);
                            //_balance.save(); //async
                            actions.log('balance:items:remain-for-saving', _stackSaving.length);
                        }, balanceItemMatch, balanceItemKeys).on('created', (err, _balanceItem) => {
                            //_balance.items = _balance.items || [];
                            _balance.items.push(_balanceItem);
                            actions.log('balance:item:created **');
                        }).on('updated', (err, _balanceItem) => {
                            actions.log('balance:item:updated **');
                        });

                    });
                    if (exit) return; //headers alredy sent;
                    _balance.amount = balanceAmount;
                    var waitChilds = setInterval(() => {
                        if (_stackSaving.length === 0) {
                            clearInterval(waitChilds);
                            _balance.save((err, r) => {
                                _retrieve();
                            });
                        }
                    }, 50);
                }
            });
        }

        function _orderRules() {
            if (_user.userType == 'diag') return { _diag: _user._id };
            if (_user.userType == 'client') return { _client: _user._id };
            if (_user.userType == 'admin') return {};
        }
    }

    function _retrieve() {
        actions.log('balance:retrieve');
        Balance.get({
            _user: data._id,
            __populate: {
                'items': '_user _order pending amount description'
            }
        }, (err, _balance) => {
            return cb(err, _balance);
        });
    }
}

function save(data, cb) {
    actions.createUpdate(data, cb, {
        email: data.email,
        userType: data.userType
    }, ['userType', 'email']).on('created', (err, _user) => {
        var notify = null;
        switch (_user.userType) {
            case 'admin':
                notify = email.adminNewAccount;
                break;
            case 'diag':
                notify = email.diagNewAccount;
                break;
            case 'client':
                notify = email.clientNewAccount;
                break;
        }
        if (notify) {
            notify(_user, (err, r) => email.handleNewAccount(_user, err, r));
        }
    });
}

function create(data, cb) {
    actions.create(data, cb, ['email', 'userType', 'password']);
}

function createUser(data, cb) {
    actions.log('createUser=' + JSON.stringify(data));
    data.password = data.password || generatePassword(8);
    data.userType = data.userType || 'admin';
    create(data, cb);
}

function createDiag(data, cb) {
    actions.log('createDiag=' + JSON.stringify(data));
    data.userType = 'diag';
    createUser(data, (err, _user) => {
        if (err) return cb(err, null);
        email.diagNewAccount(_user, (err, r) => {
            //async (write log on error)
            if (r.ok) {
                actions.log(_user.email + ' new account email sended' + JSON.stringify(r));
                _user.passwordSended = true;
                _user.save((err, r) => {
                    if (!err) actions.log(_user.email + ' passwordSended=true');
                });
            } else {
                actions.log(_user.email + ' new account email sended failed');
                actions.log(JSON.stringify(err));
            }
        });
        return cb(err, _user);
    });
}

function createClient(data, cb) {
    actions.log('createClient=' + JSON.stringify(data));
    data.userType = 'client';
    data.clientType = data.clientType || 'landlord';
    createUser(data, (err, _user) => {
        if (err) return cb(err, null);
        sendAccountsDetails(_user);
        return cb(err, _user);
    });
}

function sendAccountsDetails(_user) {
    email.clientNewAccount(_user, (err, r) => {
        //async (write log on error)
        if (r.ok) {
            actions.log(_user.email + ' new account email sended' + JSON.stringify(r));
            _user.passwordSended = true;
            _user.save((err, r) => {
                if (!err) actions.log(_user.email + ' passwordSended=true');
            });
        } else {
            actions.log(_user.email + ' new account email sended failed');
            actions.log(JSON.stringify(err));
        }
    });
}

function createClientIfNew(data, cb) {
    actions.log('createClientIfNew=' + JSON.stringify(data));
    actions.check(data, ['email'], (err, r) => {
        if (err) return cb(err, null);
        actions.get({ email: data.email }, (err, r) => {
            if (err) return cb(err, null);
            if (!r) {
                createClient(data, cb);
            } else {

                //in 10 seconds, try send account details if passwordSended==false
                setTimeout(function() {
                    if (!r.passwordSended) {
                        sendAccountsDetails(r);
                    }
                }, 10000);

                cb(null, r);
            }
        });
    });
}

function login(data, cb) {
    console.log('USER:login=' + JSON.stringify(data));
    User.findOne(actions.toRules({
        email: data.email,
        password: data.password
    })).exec(cb);
}


function passwordReset(data, cb) {
    actions.check(data, ['email'], (err, r) => {
        if (err) return cb(err, r);
        actions.get({
            email: data.email
        }, (err, _user) => {
            if (err) return cb(err, _user);
            if (_user) {

                _user.password = generatePassword(8);
                _user.save();

                email.passwordReset(_user, (err, r) => {
                    return cb(err, r);
                });
            }
        })
    });
}

exports.actions = {
    //custom
    balance: balance,
    save: save,
    createClientIfNew: createClientIfNew,
    createClient:createClient,
    login: login,
    createDiag: createDiag,
    passwordReset: passwordReset,
    //heredado
    existsById: actions.existsById,
    existsByField: actions.existsByField,
    createUpdate: actions.createUpdate,
    getAll: actions.getAll,
    remove: actions.remove,
    result: actions.result,
    get: actions.get,
    check: actions.check,
    removeAll: actions.removeAll,
    toRules: actions.toRules,
    find: actions.find,
    create: create,
    log: actions.log
};

exports.routes = (app) => {
    app.post('/user/createClient', (req, res) => createClient(req.body, actions.result(res)));
    app.post('/user/existsById', (req, res) => actions.existsById(req.body, actions.result(res)));
    app.post('/user/existsByField', (req, res) => actions.existsByField(req.body, actions.result(res)));
    app.post('/user/createUpdate', (req, res) => actions.createUpdate(req.body, actions.result(res)));
    app.post('/user/create', (req, res) => create(req.body, actions.result(res)));
    app.post('/user/find', (req, res) => actions.find(req.body, actions.result(res)));
    app.post('/user/login', (req, res) => login(req.body, actions.result(res)));
    app.post('/user/save', (req, res) => save(req.body, actions.result(res)));
    app.post('/user/get', (req, res) => actions.get(req.body, actions.result(res)));
    app.post('/user/getAll', (req, res) => actions.getAll(req.body, actions.result(res)));
    app.post('/user/remove', (req, res) => actions.remove(req.body, actions.result(res)));
    app.post('/user/removeAll', (req, res) => actions.removeAll(req.body, actions.result(res)));
    actions.log('routes-user-ok');
}
