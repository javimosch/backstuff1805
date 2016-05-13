var mongoose = require('../model/db').mongoose;
var moment = require('moment');
var promise = require('../model/utils').promise;
var _ = require('lodash');
var generatePassword = require("password-maker");
var validate = require('../model/validator').validate;
var handleMissingKeys = require('../model/validator').handleMissingKeys;
//var ClientActions = require('./handlers.client').actions;

var Order = mongoose.model('Order');
var Log = require('../model/db.actions').create('Log');
var User = require('../model/db.actions').create('User');
var actions = require('../model/db.actions').create('Order');
var UserAction = require('./ctrl.user');

//var PaymentAction = require('./handlers/payment').actions;
var payment = require('./ctrl.payment');
var stripe = payment.stripe;
var email = require('./ctrl.email');
var Notif = require('./ctrl.notification');
var NOTIFICATION = Notif.NOTIFICATION;

var saveKeys = ['_client', '_diag', 'start', 'end', 'diags'

    , 'address', 'price' //, 'time'
];


function LogSave(msg, type) {
    Log.save({
        message: msg,
        type: type || 'error'
    });
}

function pay(data, cb) {
    actions.log('pay=' + JSON.stringify(data));
    actions.check(data, ['stripeToken'], (err, r) => {
        if (err) return cb(err, r);
        //
        var _userID = data._client && data._client._id || data._client;
        UserAction.get({
            _id: _userID
        }, (err, _user) => {
            if (err) return cb(err, _user);
            _user.stripeToken = data.stripeToken; //
            if (_user.stripeCustomer) {
                data.stripeCustomer = _user.stripeCustomer;
                stripe.customers.retrieve(
                    data.stripeCustomer,
                    function(err, customer) {
                        if (customer) {
                            _payIfNotPaidYet(data);
                        }
                        else {
                            _createCustomer(_user);
                        }
                    }
                );
            }
            else {
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
                }
                else {
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
                actions.get({
                    _id: data._id
                }, (_err, _order) => {
                    if (_order.status == 'delivered') {
                        _order.status = 'completed';
                    }
                    else {
                        _order.status = 'prepaid';
                    }
                    _order.save((err, r) => {
                        if (err) return cb(err, r);

                        actions.get({
                            _id: _order._id,
                            _populate: {
                                _client: 'email firstName lastName companyName cellPhone',
                                _diag: "email firstName lastName"
                            }
                        }, () => {
                            notifyPaymentSuccess(_order);
                        });

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
    payment.listCustomerCharges({
        stripeCustomer: data.stripeCustomer
    }, (err, _chargeR) => {
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
    if (!_order.___ready) return actions.get({
        _id: _order._id,
        _populate: {
            _client: 'email firstName lastName companyName cellPhone',
            _diag: "email firstName lastName"
        }
    }, () => {
        _order.___ready=true;
        return notifyPaymentSuccess(_order);
    });


    actions.log('notifyPaymentSuccess:start=' + JSON.stringify(_order));
    UserAction.get({
        _id: _order._client._id || _order._client
    }, (_err, _client) => {
        Notif.trigger(NOTIFICATION.CLIENT_ORDER_PAYMENT_SUCCESS, {
            _user: _client,
            _order: _order
        });

        if (_order.landLordEmail) {
            Notif.trigger(NOTIFICATION.LANDLORD_ORDER_PAYMENT_SUCCESS, {
                _user: _client,
                _order: _order
            });
        }

    });
    UserAction.get({
        _id: _order._diag._id || _order._diag
    }, (_err, _diag) => {
        Notif.trigger(NOTIFICATION.DIAG_RDV_CONFIRMED, {
            _user: _diag,
            _order: _order
        });
    });
    UserAction.getAll({
        userType: 'admin'
    }, (_err, _admins) => {
        _admins.forEach((_admin) => {
            Notif.trigger(NOTIFICATION.ADMIN_ORDER_PAYMENT_SUCCESS, {
                _user: _admin,
                _order: _order
            });
        })
    });


}

function syncStripe(data, cb) {
    actions.log('syncStripe:start=' + JSON.stringify(data || {}));
    UserAction.getAll({
        __rules: {
            stripeCustomer: {
                $ne: null
            }
        }
    }, (err, _users) => {
        if (err) return cb(err, r);
        _users.forEach((_user) => {
            payment.listCustomerCharges({
                stripeCustomer: _user.stripeCustomer
            }, (err, _chargeR) => {
                if (err) return cb(err, r);
                var _charges = _chargeR.data;

                _charges.forEach((_charge) => {
                    if (_charge.paid && !_charge.refunded) {
                        _syncOrderStatus(_charge, true);
                    }
                    else {
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
    actions.log('_syncOrderStatus:isPaid=' + JSON.stringify(isPaid));
    if (isPaid) {
        Order.update({
            _id: {
                $eq: _charge.metadata._order
            },
            status: {
                $in: ['created', 'ordered']
            }
        }, {
            status: 'prepaid'
        }).exec();
        Order.update({
            _id: {
                $eq: _charge.metadata._order
            },
            status: {
                $in: ['delivered']
            }
        }, {
            status: 'completed'
        }).exec();
    }
    else {
        Order.update({
            _id: {
                $eq: _charge.metadata._order
            },
            status: {
                $in: ['prepaid']
            }
        }, {
            status: 'ordered'
        }).exec();
        Order.update({
            _id: {
                $eq: _charge.metadata._order
            },
            status: {
                $in: ['completed']
            }
        }, {
            status: 'delivered'
        }).exec();
    }
    actions.log('_syncOrderStatus=' + JSON.stringify(_charge.metadata._order));
}

function confirm(data, cb) {
    actions.log('confirm=' + JSON.stringify(data));
    actions.getById(data, (err, _order) => {
        if (err) return cb(err, _order);
        if (_order.status == 'created') {
            _order.status = 'ordered';
            _order.save();
            User.getAll({
                userType: 'admin'
            }, (err, _admins) => {
                if (err) return cb(err, _admins);
                _admins.forEach(_admin => {

                    Notif.ORDER_CONFIRMED_FOR_INVOICE_END_OF_THE_MONTH({
                        _user: _admin,
                        _order: _order
                    }, (_err, r) => {
                        if (r.ok) {
                            cb({
                                ok: true,
                                message: 'Order confirmed and admins notified by email.'
                            });
                        }
                    })
                });
            });
        }
        else {
            cb(null, {
                ok: true,
                message: 'Order already confirmed. (ordered)'
            });
        }
    });
}

function create(data, cb) {
    actions.create(data, cb, saveKeys);
}


function notifyClientOrderCreation(_order) {
    actions.log('async:notifyClientOrderCreation:start');
    if (_order && _order.info) {
        if (_order.info.clientNotified != true) {
            UserAction.get({
                _id: _order._client._id || _order._client
            }, (_err, _client) => {
                _client._orders.push(_order.id);

                /*
                Notif.trigger(NOTIFICATION.DIAGS_CLIENT_ORDER_CREATED, {
                    _user: _client,
                    _order: _order
                }, function(err, r) {
                    if (err) {
                        LogSave("Order creation notification email send fail. The user is " + _client.email);
                        actions.log('async:notifyClientOrderCreation:failed');
                    }
                    else {
                        actions.log('async:notifyClientOrderCreation:success', _client.email);
                        _order.info.clientNotified = true;
                        _order.save();
                    }
                });*/

            });
        }
        else {
            actions.log('async:notifyClientOrderCreation:already-notified');
        }
    }
    else {
        actions.log('async:notifyClientOrderCreation:order-info-undefined');
    }
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

        //notifyClientOrderCreation(r);

        if (r.status === 'prepaid') {
            notifyPaymentSuccess(r);
        }


        cb(err, r);
    }, {}, saveKeys).on('created', (_err, _order) => {


        UserAction.get({
            _id: _order._client._id || _order._client
        }, (_err, _client) => {
            _client._orders.push(_order.id);

            /*
                        Notif.trigger(NOTIFICATION.DIAGS_CLIENT_ORDER_CREATED, {
                            _user: _client,
                            _order: _order
                        });*/

        });
        UserAction.get({
            _id: _order._diag._id || _order._diag
        }, (_err, _diag) => {
            _diag._orders.push(_order.id);

            /*
                        Notif.trigger(NOTIFICATION.ORDER_CREATED, {
                            _user: _diag,
                            _order: _order
                        });*/

        });

        //admin get notified only when the order is prepaid or ordered.
        /*
        UserAction.getAll({ userType: 'admin' }, (err, _admins) => {
            _admins.forEach((_admin) => {
                email.newOrder(_admin, _order, null);
            })
        });*/

    });
}

function orderExists(data, cb) {
    actions.log('orderExists=' + JSON.stringify(data));
    //Si existe un order match user:email, address, start, end, price.
    actions.getAll({
        __populate: {
            '_client': 'email'
        },
        //'_client.email': data.email,
        address: data.address,
        //diagStart: data.diagStart,
        //diagEnd: data.diagEnd,
    }, (err, list) => {
        actions.log('orderExists:getAll:err:?=' + JSON.stringify(err));
        if (err) return cb(err, list);
        var rta = null;
        var rtaErr = null;
        list.forEach((r) => {
            actions.log('orderExists:getAll:reading=' + JSON.stringify(r._client.email));
            //check dates sameday same hour, same address
            var sameOrder = true && moment(r.diagStart).isSame(data.diagStart, 'day') && moment(r.diagEnd).isSame(data.diagEnd, 'day') && r.price == data.price && r.address == data.address;
            if (!rta) {
                if (r && r._client.email == data.email) {
                    if (sameOrder) {
                        rta = r;
                        rtaErr = 'ORDER_EXISTS';
                        actions.log('orderExists:exists=' + JSON.stringify({
                            sameOrder: sameOrder,
                            clientEmail: r._client.email,
                            clientEmailBooking: data.email
                        }));
                    }
                }
                else {
                    if (sameOrder) {
                        rta = r;
                        rtaErr = 'ORDER_TAKEN';
                        actions.log('orderExists:taken=' + JSON.stringify({
                            sameOrder: sameOrder,
                            clientEmail: r._client.email,
                            clientEmailBooking: data.email
                        }));
                    }
                }
            }
        });
        actions.log('orderExists:rta=' + JSON.stringify(rta));
        return cb(rtaErr, rta); //returns the order as result
    });
}

//Save and order
//If data has _client, use that client. If not, data requires email and clientType to search or crate a new user on the fly.
function saveWithEmail(data, cb) {
    actions.log('saveWithEmail=' + JSON.stringify(data));
    actions.check(data, ['_diag', 'diagStart', 'diagEnd'

        , 'diags', 'address', 'price'
    ], (err, r) => {
        if (err) return cb(err, r);
        //
        orderExists(data, (err, r) => {
            if (err) return cb(err, r);

            if (data._client) {
                return save(data, cb);
            }

            if (data._client) {
                if (data._client._id) data._client = data._client._id;
                return save(data, cb);
            }
            else {


                actions.check(data, ['email', 'clientType'], (err, r) => {
                    if (err) return cb(err, r);
                    _setUserUsingEmailAndClientType();
                });
            }

            function _setUserUsingEmailAndClientType() {
                UserAction.get({
                    email: data.email,
                    userType: 'client',
                    clientType: data.clientType,
                }, (err, r) => {
                    if (err) return cb(err, r);
                    actions.log('saveWithEmail=user:get:return' + JSON.stringify(r));
                    if (r) {
                        data._client = r._id;
                        return save(data, cb);
                    }
                    else {
                        UserAction.createClientIfNew({
                            email: data.email
                        }, (err, r) => {
                            if (err) return cb(err, r);
                            data._client = r._id;
                            return save(data, cb);
                        });
                    }
                });
            }
        });
        //    
    });
}



module.exports = {
    //custom
    save: save,
    saveWithEmail: saveWithEmail,
    pay: pay,
    syncStripe: syncStripe,
    confirm: confirm,
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
