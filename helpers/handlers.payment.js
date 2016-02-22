var Order = require('./handler.actions').create('Order');
var User = require('./handler.actions').create('Order');
var getFile = require('./utils').getFile;
var sendEmail = require('./utils.mailing').sendEmail;
var moment = require('moment');
var S = require('string');
var btoa = require('btoa')
var adminUrl = require('./utils').adminUrl;
var formatTime = require('./utils').formatTime;


var stripeSecretTokenDEV = "sk_test_P9NzNL96T3X3FEgwOVxw8ovm";
var stripe = require("stripe")(process.env.stripeSecretToken || stripeSecretTokenDEV);


var modelName = 'payment';
var actions = {
    log: (m) => {
        console.log(modelName.toUpperCase() + ': ' + m);
    }
};

function associatedOrder(data, cb) {
    //data.source
    if (data.source.indexOf('ch') !== -1) {
        _charge(data.source);
    } else {
        stripe.refunds.retrieve(
            data.source,
            function(err, refund) {
                _charge(refund.charge);
            }
        );
    }

    function _charge(id) {
        stripe.charges.retrieve(
            id,
            function(err, charge) {
                var _id = charge.metadata._order;
                var _orderDescription = charge.metadata._orderDescription;
                var _orderURL = charge.metadata._orderURL;
                //Order.get({ _id: _id }, (err, _order) => {
                cb(null, {
                    _order: {
                        description: _orderDescription,
                        _id: _id
                    }
                });
                //..});
            }
        );
    }
}


function balanceTransactions(data, cb) {

    stripe.balance.listTransactions({}, function(err, transactions) {
        cb(err, transactions);
    });
}

function balance(data, cb) {
    stripe.balance.retrieve(function(err, balance) {
        cb(err, balance);
    });
}

function listCharges(data, cb) {
    actions.log('listCharges=' + JSON.stringify(data));
    //if (!data.stripeCustomer) return cb("listCustomerCharges: stripeCustomer required.", null);
    stripe.charges.list((err, charges) => {
        if (err) return cb(err, null);
        cb(null, charges);
    });
}

function listUncaptured(data, cb) {
    actions.log('listUncaptured=' + JSON.stringify(data));
    var rta = [];
    listCharges(data, (err, chargesR) => {
        chargesR.data.forEach((_charge) => {
            if (!_charge.captured) {
                rta.push(_charge);
            }
        });
        cb(null, rta);
    });
}

function listCustomerCharges(data, cb) {
    actions.log('listCustomerCharges=' + JSON.stringify(data));
    if (!data.stripeCustomer) return cb("listCustomerCharges: stripeCustomer required.", null);
    stripe.charges.list({ customer: data.stripeCustomer },
        (err, charges) => {
            if (err) return cb(err, null);
            cb(null, charges);
        }
    );
}

function createCustomer(_user, cb) {
    actions.log('createCustomer=' + JSON.stringify(_user));
    stripe.customers.create({
        email: _user.email,
        metadata: {
            diagUserId: _user._id.toString()
        },
        description: 'Diags custumer',
        source: _user.stripeToken
    }, function(err, customer) {
        if (err) return cb(err, null);
        actions.log('createCustomer:rta=' + JSON.stringify(customer));
        return cb(null, customer);
    });
}

function payOrder(_order, cb) {
    actions.log('payOrder=' + JSON.stringify(_order));

    if (!_order.stripeToken) return cb("payOrder: stripeToken required.", null);
    if (!_order.stripeCustomer) return cb("payOrder: stripeCustomer required.", null);

    var charge = stripe.charges.create({
        amount: _order.price * 100, // amount in cents, again
        currency: "eur",
        //source: _order.stripeToken,
        description: "Order payment",
        customer: _order.stripeCustomer,
        metadata: {
            _order: _order._id,
            _orderDescription: _order.address + ' (' + formatTime(_order.diagStart) + ' - ' + formatTime(_order.diagEnd) + ')',
            _orderURL: adminUrl('/orders/edit/' + _order._id)
        }
    }, (err, charge) => {
        if (err && err.type === 'StripeCardError') {
            // The card has been declined
            cb(err, null);
        } else {
            actions.log('payOrder:rta=' + JSON.stringify(charge));

            captureOrderCharge(charge); //async

            cb(null, charge)
        }
    });
}

function captureOrderCharge(charge, cb) {
    actions.log('captureOrderCharge:start=' + JSON.stringify(charge));
    stripe.charges.capture({
        charge: charge.id,
        statement_descriptor: (process.env.companyName || 'Diags S.A') + ' - Custom inspection.'
    }, function(err, charge) {
        // asynchronously called
        if (err) {
            actions.log('captureOrderCharge:error=' + JSON.stringify(err));
        }
        actions.log('captureOrderCharge:rta=' + JSON.stringify(charge));
    });
}

exports.actions = {
    payOrder: payOrder,
    createCustomer: createCustomer,
    listCustomerCharges: listCustomerCharges,
    listCharges: listCharges,
    listUncaptured: listUncaptured,
    balance: balance,
    balanceTransactions: balanceTransactions,
    associatedOrder: associatedOrder
};
