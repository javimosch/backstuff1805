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

var payment = require('./handlers.payment').actions;

var email = require('./handlers.email').actions;

var saveKeys = ['_client', '_diag', 'diagStart', 'diagEnd', 'diags'

    , 'address', 'price' //, 'time'
];

function pay(data, cb) {
    actions.log('pay=' + JSON.stringify(data));
    actions.check(data, ['stripeToken'], (err, r) => {
        if (err) return cb(err, null);
        //
        UserAction.get({ _id: data._client._id }, (err, _user) => {
            if (err) return cb(err, null);
            if (_user.stripeCustomer) {
                data.stripeCustomer = _user.stripeCustomer;
                _pay();
            } else {
                _user.stripeToken = data.stripeToken;
                payment.createCustomer(_user, (err, stripeCustomer) => {
                    if (err) return cb(err, null);
                    _user.stripeCustomer = stripeCustomer.id;
                    data.stripeCustomer = stripeCustomer.id;
                    _user.save();
                    _pay();
                });
            }
        });

        function _pay() {
            payment.payOrder(data, (err, _charge) => {
                if (err) return cb(err, null);
                //Change status to prepaid  (sync)
                actions.get({ _id: data._id }, (err, _order) => {
                    if (_order.status == 'delivered') {
                        _order.status = 'completed';
                    } else {
                        _order.status = 'prepaid';
                    }
                    _order.save((err, r) => {
                        if (err) return cb(err, null);
                        _success();
                    });
                });
                //
                function _success() {
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

function syncStripe(data, cb) {
    actions.log('syncPayments:start=' + JSON.stringify(data));
    UserAction.getAll({
        __rules: {
            stripeCustomer: { $ne: null }
        }
    }, (err, _users) => {
        if (err) return cb(err, null);
        _users.forEach((_user) => {
            payment.listCustomerCharges({ stripeCustomer: _user.stripeCustomer }, (err, _charge) => {
                if (err) return cb(err, null);
                _charge = _charge.data[0];
                actions.log('syncPayments:charge=' + JSON.stringify(_charge.metadata));

                Order.update({
                    _id:{$eq:_charge.metadata._order},
                    status:{$in:['ordered']}
                },{
                    status:'prepaid'
                }).exec();
                Order.update({
                    _id:{$eq:_charge.metadata._order},
                    status:{$in:['delivered']}
                },{
                    status:'completed'
                }).exec();

                actions.log('syncPayments=' + JSON.stringify(_charge.metadata._order));


            });
        });
        cb(null,{
            ok:true,message:"Sync in progress, see server console for more details.",result:null
        });
    })
}

function create(data, cb) {
    actions.create(data, cb, saveKeys);
}

function save(data, cb) {
    actions.log('save=' + JSON.stringify(data));
    actions.createUpdate(data, (err, r) => {
        if (err) return cb(err, null);
        cb(err, r);
    }, {}, saveKeys).on('created', (err, _order) => {

        UserAction.get({ _id: _order._client._id || _order._client }, (err, _client) => {
            email.newOrder(_client, _order, null);
        });
        UserAction.get({ _id: _order._diag._id || _order._diag }, (err, _diag) => {
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
    actions.get({
        address: data.address,
        diagStart: data.diagStart,
        diagEnd: data.diagEnd,
        __populate: { '_client': 'email' }
    }, (err, r) => {
        if (err) return cb(err, null);
        if (r && r._client.email == data.email) {
            cb("ORDER_EXISTS", null);
        } else {
            cb(null, null); //
        }
    });
}

function saveWithEmail(data, cb) {
    actions.log('saveWithEmail=' + JSON.stringify(data));
    actions.check(data, ['email', '_diag', 'diagStart', 'diagEnd'

        , 'diags', 'address', 'price' //, 'time'
    ], (err, r) => {
        if (err) return cb(err, null);
        //
        orderExists(data, (err, r) => {
            if (err) return cb(err, null);
            UserAction.get({
                email: data.email,
                type: 'client'
            }, (err, r) => {
                if (err) return cb(err, null);
                actions.log('saveWithEmail=user:get:return' + JSON.stringify(r));
                if (r) {
                    data._client = r._id;
                    return save(data, cb);
                } else {
                    UserAction.createClientIfNew({
                        email: data.email
                    }, (err, r) => {
                        if (err) return cb(err, null);
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
    syncStripe:syncStripe,
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
