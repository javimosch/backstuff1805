//var Order = mongoose.model('Order');
//var User = mongoose.model('User');
var Order = require('./handler.actions').create('Order');
var User = require('./handler.actions').create('Order');
var getFile = require('./utils').getFile;
var sendEmail = require('./utils.mailing').sendEmail;
var moment = require('moment');
var S = require('string');
var btoa = require('btoa')

var adminUrl = require('./utils').adminUrl;

var modelName = 'email';
var actions = {
    log: (m) => {
        console.log(modelName.toUpperCase() + ': ' + m);
    }
};



function replace(html, params) {
    html = S(html);
    for (var x in params) {
        //console.log('EMAIL:REPLACE:'+x+':'+params[x]);
        html = html.replaceAll(x, params[x]);
    }
    return html.s;
}

function template(n, replaceParams) {
    var html = getFile('../templates/' + n + '.html');
    if (replaceParams) {
        html = replace(html, replaceParams);
        //console.log('EMAIL:REPLACE:',html);
    }
    return html;
}

function dummy(cb) {
    var rta = {
        ok: true,
        message: 'Mailing disabled'
    };
    if (cb) {
        cb(null, rta);
    } else {
        actions.log('INFO=' + JSON.stringify(rta));
    }
}

function send(opt) {
    if (process.env.disableMailing === '1') return dummy(opt.cb);
    var html = template(opt.templateName, opt.templateReplace);
    var data = {
        html: html,
        from: process.env.emailFrom || 'diags-project@startup.com',
        to: opt.to || process.env.emailTo || 'arancibiajav@gmail.com',
        subject: 'Diag Project | ' + opt.subject
    };
    sendEmail(data, (err, r) => {
        if (opt.cb) {
            opt.cb(err, r);
        } else {
            //LOG
        }
    });
}

function time(d) {
    return moment(d).format('HH:mm');
}

function newOrder(_user, _order, cb) {
    actions.log('newOrder=' + JSON.stringify(_user));
    send({
        to: _user.email,
        subject: "New Order",
        templateName: 'new.order.created',
        templateReplace: {
            '$NAME': _user.firstName || _user.email,
            '$ORDER_URL': adminUrl('/orders/edit/' + _order._id),
            '$ORDER_DESCR': _order.address + ' (' + time(_order.diagStart) + ' - ' + time(_order.diagEnd) + ')',
            '$PASSWORD': _user.password || '[Contact support for the password]',
            '$URL': adminUrl('?email=' + _user.email + '&k=' + btoa(_user.password))
        },
        cb: cb
    });
}

//Email from Agency to Landlord
function orderPaymentLink(_order, cb) {
    actions.log('orderPaymentLink=' + JSON.stringify(_order));
    if (typeof _order._client === 'string') {
        if (_order._id) return cb("_id required");
        actions.log('orderPaymentLink:updating-order');
        return Order.update(_order, () => {
            _order.__populate = {
                _client: 'email firstName lastName'
            };
            actions.log('orderPaymentLink:fetching-order');
            Order.getById(_order, _send);
        });
    } else {
        _send(null,_order);
    }

    function _send(err,_order) {
        if(err) return cb(err,_order);
        actions.log('orderPaymentLink:sending..');
        send({
            to: _order.landLordEmail,
            subject: "Payment notification",
            templateName: 'agency.payment-link',
            templateReplace: {
                '$NAME': _order.landLordFullName || _order.landLordEmail,
                '$AGENCY': _order._client.firstName || _order._client.email,
                '$ORDER_DESCRIPTION': _order.address + ' (' + time(_order.diagStart) + ' - ' + time(_order.diagEnd) + ')',
                '$ORDER_AMOUNT': _order.price,
                '$ORDER_PAY_LINK': adminUrl('/orders/view/' + _order._id)
            },
            cb: (err,r)=>{
                actions.log('orderPaymentLink:sended!');
                return cb(err,r);
            }
        });
    }
}

function orderConfirmedForInvoiceEndOfTheMonth(_user, _order, cb) {
    actions.log('orderConfirmedForInvoiceEndOfTheMonth=' + JSON.stringify({
        email: _user.email,
        _order: _order._id,
        price: _order.price
    }));
    send({
        to: _user.email,
        subject: "Order For 'end of the month invoicing' confirmed",
        templateName: 'order.confirmed.invoice-end-of-the-month',
        templateReplace: {
            '$NAME': _user.firstName || _user.email,
            '$ORDER_URL': adminUrl('/orders/edit/' + _order._id),
            '$ORDER_DESCR': _order.address + ' (' + time(_order.diagStart) + ' - ' + time(_order.diagEnd) + ')',
        },
        cb: cb
    });
}

function orderPaymentSuccess(_user, _order, cb) {
    actions.log('orderPaymentSuccess=' + JSON.stringify({
        email: _user.email,
        _order: _order._id,
        price: _order.price
    }));
    send({
        to: _user.email,
        subject: "Order Payment Notification",
        templateName: 'order.payment.success.' + _user.userType,
        templateReplace: {
            '$NAME': _user.firstName || _user.email,
            '$ORDER_URL': adminUrl('/orders/edit/' + _order._id),
            '$ORDER_DESCR': _order.address + ' (' + time(_order.diagStart) + ' - ' + time(_order.diagEnd) + ')',
        },
        cb: cb
    });
}


function diagNewAccount(_user, cb) {
    actions.log('diagNewAccount=' + JSON.stringify(_user));
    send({
        to: _user.email,
        subject: "New Diag Account",
        templateName: 'diag.new.account',
        templateReplace: {
            '$NAME': _user.firstName || _user.email,
            '$PASSWORD': _user.password || '[Contact support for the password]',
            '$URL': process.env.adminURL || 'http://localhost:3000/admin?email=' + _user.email + '&k=' + btoa(_user.password)
        },
        cb: cb
    });
}

function adminNewAccount(_user, cb) {
    actions.log('adminNewAccount=' + JSON.stringify(_user));
    send({
        to: _user.email,
        subject: "Your Admin Account is ready",
        templateName: 'admin.new.account',
        templateReplace: {
            '$NAME': _user.firstName || _user.email,
            '$PASSWORD': _user.password || '[Contact support for the password]',
            '$URL': process.env.adminURL || 'http://localhost:3000/admin?email=' + _user.email + '&k=' + btoa(_user.password)
        },
        cb: cb
    });
}

function clientNewAccount(_user, cb) {
    actions.log('clientNewAccount=' + JSON.stringify(_user));
    send({
        to: _user.email,
        subject: "New Client Account",
        templateName: 'client.new.account',
        templateReplace: {
            '$NAME': _user.firstName || _user.email,
            '$PASSWORD': _user.password || '[Contact support for the password]',
            '$URL': process.env.adminURL || 'http://localhost:3000/admin?email=' + _user.email + '&k=' + btoa(_user.password)
        },
        cb: cb
    });
}

function handleNewAccount(_user, err, r) {
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
}

function passwordReset(_user, cb) {
    actions.log('handlePasswordReset=' + JSON.stringify(_user));
    send({
        to: _user.email,
        subject: "Password reset",
        templateName: 'user.new.password',
        templateReplace: {
            '$NAME': _user.firstName || _user.email,
            '$PASS': _user.password || '[Contact support for the password]',
            '$URL': process.env.adminURL || 'http://localhost:3000/admin?email=' + _user.email + '&k=' + btoa(_user.password)
        },
        cb: cb
    });
}

exports.actions = {
    clientNewAccount: clientNewAccount,
    diagNewAccount: diagNewAccount,
    adminNewAccount: adminNewAccount,
    handleNewAccount: handleNewAccount,
    newOrder: newOrder,
    passwordReset: passwordReset,
    orderPaymentSuccess: orderPaymentSuccess,
    orderPaymentLink:orderPaymentLink
};
