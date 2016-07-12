var ctrl = require('../model/db.controller').create;
module.exports = {
    pay: pay
};


function isPaid(data, cb) {
    var Payment = ctrl('Payment');
    console.log('ORDER', 'orderHasPayment=' + JSON.stringify(data));
    if (!data.stripeCustomer) return cb("ORDER isPaid : stripeCustomer required.", null);
    //
    var rta = false;
    Payment.listCustomerCharges({
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


function pay(data, cb) {
    //data = _order + stripeToken
    console.log('ORDER', 'PAY:START');
    var _order = data;
    if (_order.isPaid) {
        console.log('ORDER', 'PAY:ALREADY-PAID');
        return cb('ALREADY-PAID'); //Its an error
    }

    //amount
    _order.amount = _order.priceTTC * 100; //cents

    var Order = ctrl('Order');
    var User = ctrl('User');
    var Payment = ctrl('Payment');
    //STEP 1 : stripeToken required
    Order.check(_order, ['stripeToken'], (err, r) => {
        if (err) return cb(err, r); //stripeToken required
        var _userID = _order._owner && _order._owner._id || _order._owner;
        //STEP 2 : stripeCustomer (associated to user) required
        Payment.getUserWithStripeCustomer(_userID, _order.stripeToken, (err, _user) => {
            if (err) return cb(err, r);
            _user.stripeToken = _order.stripeToken; // for payment
            //STEP 3 : payment (charge) using stripeToken and stripeCustomer
            Payment.payUsingStripeCustomer({
                _order: _order,
                _user: _user
            }, cb);
        });
    });
}
