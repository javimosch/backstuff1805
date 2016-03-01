var mongoose = require('./db').mongoose;
var moment = require('moment');
var promise = require('./utils').promise;
var _ = require('lodash');
var generatePassword = require("password-maker");
var validate = require('./validator').validate;
var handleMissingKeys = require('./validator').handleMissingKeys;
//var ClientActions = require('./handlers.client').actions;
var User = mongoose.model('User');
var Order = mongoose.model('Order');
var actions = require('./handler.actions').create('Order');
var UserAction = require('./handlers.user').actions;

//var PaymentAction = require('./handlers/payment').actions;
var stripe  = require('./stripeService').stripe;
var payment = require('./stripeService').actions;

var email = require('./handlers.email').actions;

var saveKeys = ['_client', '_diag', 'diagStart', 'diagEnd', 'diags'

    , 'address', 'price' //, 'time'
];

function pay(data, cb) {
    actions.log('pay=' + JSON.stringify(data));
    actions.check(data, ['stripeToken'], (err, r) => {
        if (err) return cb(err, r);
        //
        var _userID = data._client && data._client._id || data._client;
        UserAction.get({ _id: _userID }, (err, _user) => {
            if (err) return cb(err, _user);
            _user.stripeToken = data.stripeToken;//
            if (_user.stripeCustomer) {
                data.stripeCustomer = _user.stripeCustomer;
                stripe.customers.retrieve(
                    data.stripeCustomer,
                    function(err, customer) {
                        if (customer) {
                            _payIfNotPaidYet(data);
                        } else {
                            _createCustomer(_user);
                        }
                    }
                );
            } else {
                _user.stripeToken = data.stripeToken;
                _createCustomer(_user);
            }
        });

        function _createCustomer(_user) {
            payment.createCustomer(_user, (err, stripeCustomer) => {
                if (err) return cb(err, r);
                _user.stripeCustomer = stripeCustomer.id;
                data.stripeCustomer = stripeCustomer.id;
                _user.save();
                //
                return _payIfNotPaidYet(data);
            });
        }

        function _payIfNotPaidYet(data) {
            actions.log('_payIfNotPaidYet=' + JSON.stringify(data));
            orderHasPayment(data, (err, has) => {
                if (err) return cb(err, has);
                if (!has) {
                    return _pay(data);
                } else {
                    syncStripe();
                    actions.log('_payIfNotPaidYet:rta=' + JSON.stringify({
                        message: "Alredy paid"
                    }));
                    return cb(null, {
                        message: "Alredy paid"
                    });
                }
            })
        }

        function _pay(data) {
            actions.log('_pay:rta=' + JSON.stringify(data));
            //stripeCustomer
            payment.payOrder(data, (err, _charge) => {
                if (err) return cb(err, r);
                //Change status to prepaid  (sync)
                actions.get({ _id: data._id }, (err, _order) => {
                    if (_order.status == 'delivered') {
                        _order.status = 'completed';
                    } else {
                        _order.status = 'prepaid';
                    }
                    _order.save((err, r) => {
                        if (err) return cb(err, r);
                        notifyPaymentSuccess(_order);
                        _success();
                    });
                });
                //
                function _success() {
                    actions.log('_pay:rta=Success');
                    cb(null, {
                        ok: true,
                        message: "Pay successs",
                        result: _charge
                    });
                }
            });
        }
        //
    });
}

function orderHasPayment(data, cb) {
    actions.log('orderHasPayment=' + JSON.stringify(data));
    if (!data.stripeCustomer) return cb("orderHasPayment: stripeCustomer required.", null);
    //
    var rta = false;
    payment.listCustomerCharges({ stripeCustomer: data.stripeCustomer }, (err, _chargeR) => {
        if (err) return cb(err, _chargeR);
        var _charges = _chargeR.data;
        _charges.forEach((_charge) => {
            if (_charge.metadata._order == data._id) {
                if (_charge.paid && !_charge.refunded) {
                    rta = true;
                }
            }
        })
        return cb(null, rta);
    });
}

function notifyPaymentSuccess(_order) {
    actions.log('notifyPaymentSuccess:start=' + JSON.stringify(_order));
    UserAction.get({ _id: _order._client._id || _order._client }, (err, _client) => {
        email.orderPaymentSuccess(_client, _order, null);
    });
    UserAction.get({ _id: _order._diag._id || _order._diag }, (err, _diag) => {
        email.orderPaymentSuccess(_diag, _order, null);
    });
    UserAction.getAll({ userType: 'admin' }, (err, _admins) => {
        _admins.forEach((_admin) => {
            email.orderPaymentSuccess(_admin, _order, null);
        })
    });
}

function syncStripe(data, cb) {
    actions.log('syncStripe:start=' + JSON.stringify(data || {}));
    UserAction.getAll({
        __rules: {
            stripeCustomer: { $ne: null }
        }
    }, (err, _users) => {
        if (err) return cb(err, r);
        _users.forEach((_user) => {
            payment.listCustomerCharges({ stripeCustomer: _user.stripeCustomer }, (err, _chargeR) => {
                if (err) return cb(err, r);
                var _charges = _chargeR.data;

                _charges.forEach((_charge) => {
                    if (_charge.paid && !_charge.refunded) {
                        _syncOrderStatus(_charge, true);
                    } else {
                        _syncOrderStatus(_charge, false);
                    }
                });




            });
        });
        if (cb) {
            cb(null, {
                ok: true,
                message: "Sync in progress, see server console for more details.",
                result: null
            });
        }
    })
}

function _syncOrderStatus(_charge, isPaid) {
    actions.log('_syncOrderStatus:charge=' + JSON.stringify(_charge.metadata));
    if (isPaid) {
        Order.update({
            _id: { $eq: _charge.metadata._order },
            status: { $in: ['ordered'] }
        }, {
            status: 'prepaid'
        }).exec();
        Order.update({
            _id: { $eq: _charge.metadata._order },
            status: { $in: ['delivered'] }
        }, {
            status: 'completed'
        }).exec();
    } else {
        Order.update({
            _id: { $eq: _charge.metadata._order },
            status: { $in: ['prepaid'] }
        }, {
            status: 'ordered'
        }).exec();
        Order.update({
            _id: { $eq: _charge.metadata._order },
            status: { $in: ['completed'] }
        }, {
            status: 'delivered'
        }).exec();
    }
    actions.log('_syncOrderStatus=' + JSON.stringify(_charge.metadata._order));
}

function create(data, cb) {
    actions.create(data, cb, saveKeys);
}

function save(data, cb) {
    actions.log('save=' + JSON.stringify(data));

    //setInfo
    data.info = data.info || {};
    data.info = Object.assign(data.info || {}, {
        sell: data.info.sell || data.sell || undefined,
        house: data.info.house || data.house || undefined,
        squareMeters: data.info.squareMeters || data.squareMeters || undefined,
        apartamentType: data.info.apartamentType || data.apartamentType || undefined,
        constructionPermissionDate: data.info.constructionPermissionDate || data.constructionPermissionDate || undefined,
        gasInstallation: data.info.gasInstallation || data.gasInstallation || undefined,
    });

    actions.createUpdate(data, (err, r) => {
        if (err) return cb(err, r);
        cb(err, r);
    }, {}, saveKeys).on('created', (err, _order) => {


        UserAction.get({ _id: _order._client._id || _order._client }, (err, _client) => {
            _client._orders.push(_order.id);
            email.newOrder(_client, _order, null);
        });
        UserAction.get({ _id: _order._diag._id || _order._diag }, (err, _diag) => {
            _diag._orders.push(_order.id);
            email.newOrder(_diag, _order, null);
        });
        UserAction.getAll({ userType: 'admin' }, (err, _admins) => {
            _admins.forEach((_admin) => {
                email.newOrder(_admin, _order, null);
            })
        });

    });
}

function orderExists(data, cb) {
    actions.log('orderExists=' + JSON.stringify(data));
    //Si existe un order match user:email, address, start, end, price.
    actions.getAll({
        __populate: { '_client': 'email' },
        //'_client.email': data.email,
        address: data.address,
        //diagStart: data.diagStart,
        //diagEnd: data.diagEnd,
    }, (err, list) => {
        actions.log('orderExists:getAll:err:?=' + JSON.stringify(err));
        if (err) return cb(err, list);
        var rta = null;
        list.forEach((r) => {
            actions.log('orderExists:getAll:reading=' + JSON.stringify(r._client.email));
            if (r && r._client.email == data.email) {
                //check dates sameday same hour
                var sameOrder = true && moment(r.diagStart).isSame(data.diagStart, 'day') && moment(r.diagEnd).isSame(data.diagEnd, 'day') && r.price == data.price;
                if (sameOrder) {
                    rta = r;
                    return false;
                }
            }
        });
        actions.log('orderExists:rta=' + JSON.stringify(rta));
        return cb(rta ? "ORDER_EXISTS" : null, rta); //returns the order as result
    });
}

function saveWithEmail(data, cb) {
    actions.log('saveWithEmail=' + JSON.stringify(data));
    actions.check(data, ['email', '_diag', 'diagStart', 'diagEnd'

        , 'diags', 'address', 'price' , 'clientType'
    ], (err, r) => {
        if (err) return cb(err, r);
        //
        orderExists(data, (err, r) => {
            if (err) return cb(err, r);

            if(data._client){
                return save(data,cb);
            }

            UserAction.get({
                email: data.email,
                userType: 'client',
                clientType:data.clientType,
            }, (err, r) => {
                if (err) return cb(err, r);
                actions.log('saveWithEmail=user:get:return' + JSON.stringify(r));
                if (r) {
                    data._client = r._id;
                    return save(data, cb);
                } else {
                    UserAction.createClientIfNew({
                        email: data.email
                    }, (err, r) => {
                        if (err) return cb(err, r);
                        data._client = r._id;
                        return save(data, cb);
                    });
                }
            });
        });
        //    
    });
}



exports.actions = {
    //custom
    save: save,
    saveWithEmail: saveWithEmail,
    pay: pay,
    syncStripe: syncStripe,
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

    app.post('/order/email', (req, res) => email.clientNewAccount(req.body, actions.result(res)));
    app.post('/order/existsById', (req, res) => actions.existsById(req.body, actions.result(res)));
    app.post('/order/existsByField', (req, res) => actions.existsByField(req.body, actions.result(res)));
    app.post('/order/createUpdate', (req, res) => actions.createUpdate(req.body, actions.result(res)));
    app.post('/order/create', (req, res) => create(req.body, actions.result(res)));
    app.post('/order/find', (req, res) => actions.find(req.body, actions.result(res)));
    app.post('/order/login', (req, res) => login(req.body, actions.result(res)));
    app.post('/order/save', (req, res) => save(req.body, actions.result(res)));
    app.post('/order/pay', (req, res) => pay(req.body, actions.result(res)));
    //app.post('/order/syncPayments', (req, res) => syncPayments(req.body, actions.result(res)));
    //app.post('/order/saveTest', (req, res) => saveTest(req.body, actions.result(res)));
    app.post('/order/saveWithEmail', (req, res) => saveWithEmail(req.body, actions.result(res)));
    app.post('/order/get', (req, res) => actions.get(req.body, actions.result(res)));
    app.post('/order/getAll', (req, res) => actions.getAll(req.body, actions.result(res)));
    app.post('/order/remove', (req, res) => actions.remove(req.body, actions.result(res)));
    app.post('/order/removeAll', (req, res) => actions.removeAll(req.body, actions.result(res)));
    actions.log('routes-order-ok');

}
