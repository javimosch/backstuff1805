//var Order = mongoose.model('Order');
//var User = mongoose.model('User');
var Order = require('./handler.actions').create('Order');
var User = require('./handler.actions').create('User');
var Log = require('./handler.actions').create('Log');
var UserNotifications = require('./handler.actions').create('UserNotifications');
var Notification = require('./handler.actions').create('Notification');
var getFile = require('./utils').getFile;
var sendEmail = require('./utils.mailing').sendEmail;
var moment = require('moment');
var S = require('string');
var btoa = require('btoa')
var _ = require('lodash');

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

function send(opt, resCb) {
    if (process.env.disableMailing === '1') return dummy(opt.cb);
    var html = opt.html || template(opt.templateName, opt.templateReplace);
    if (opt.subject) {
        if (opt.subject.indexOf('Diag Project') == -1) {
            opt.subject = 'Diag Project | ' + opt.subject;
        }
    }
    var data = {
        html: html,
        from: process.env.emailFrom || 'diags-project@startup.com',
        to: opt.to || process.env.emailTo || 'arancibiajav@gmail.com',
        subject: opt.subject
    };
    if (opt._user) {
        if (opt._notification) {
            Notification.getById({ _id: opt._notification }, (err, _notification) => {
                if (err) {
                    return dblog('notification getById fail in function send');
                }
                validateSending(_notification);
            });
        } else {
            saveNotification(opt._user, data, (_notification) => {
                if (_notification) {
                    _notification.__populate = {
                        _config: 'disabledTypes'
                    }
                    validateSending(_notification);
                }
            });
        }

        function validateSending(_notification) {
            Notification.getById(_notification, (err, _notification) => {
                if (err) {
                    return dblog('notification getById fail in function send');
                }
                if (!_.includes(_notification._config.disabledTypes, _notification.type)) {
                    _send(_notification);
                }else{
                    if(resCb){
                        resCb('SENDING_DISABLED_TYPE',"");
                    }
                }
            });
        }

    } else {
        _send();
    }

    function _send(_notification) {
        sendEmail(data, (err, r) => {
            if (!err) {

                if (_notification) {
                    _notification.sended = true;
                    Notification.update(_notification, (err, _notification) => {
                        if (err) dblog('notification sended update fail in function send.');

                        if (resCb) resCb(null, {
                            message: 'Sended'
                        });

                    });
                }
                if (opt.cb) {
                    opt.cb(err, r);
                }
            } else {
                dblog('sendEmail fail, the data was ' + JSON.stringify(data));
            }
        });
    }
}

function time(d) {
    return moment(d).format('HH:mm');
}

function newOrder(_user, _order, cb) {
    actions.log('newOrder=' + JSON.stringify(_user));
    send({
        _user:_user,
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
        _send(null, _order);
    }

    function _send(err, _order) {
        if (err) return cb(err, _order);
        actions.log('orderPaymentLink:sending..');
        send({
            _user:_order._client,
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
            cb: (err, r) => {
                actions.log('orderPaymentLink:sended!');
                return cb(err, r);
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
        _user:_user,
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
        _user:_user,
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
        _user:_user,
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
        _user: _user,
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

function dblog(msg, type) {
    Log.save({ message: msg, type: type });
}

function saveNotification(_user, data, cb) {

    if (!_user || !_user._id) {
        return dblog('saveNotification fail because _user is undefined.');
    }

    //data: html,from,to,subject
    UserNotifications.getById(_user, (err, _config) => {
        if (err) return dblog('UserNotifications getById fail for user ' + _user.email);
        if (!_config) {
            dblog("No existe UserNotifications para" + _user.email + ', creando uno.', 'info');
            UserNotifications.create({
                _user: _user._id
            }, (err, _config) => {
                if (err) return dblog('UserNotifications create fail for user ' + _user.email);
                saveNotificationOn(_config);
            })
        } else {
            saveNotificationOn(_config);
        }
    });

    function saveNotificationOn(_config) {
        Notification.create({
            _config: _config,
            _user: _user._id,
            type: data.type || 'no-type',
            to: data.to || 'not-specified',
            subject: data.subject || 'not specified',
            contents: data.html || ''
        }, (err, _notification) => {
            if (err) return dblog('saveNotification fail when creating a notification for user ' + _user.email);
            if (cb) cb(_notification);
        });
    }
}

function clientNewAccount(_user, cb) {
    actions.log('clientNewAccount=' + JSON.stringify(_user));
    send({
        _user:_user,
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
        _user:_user,
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
    send: send,
    passwordReset: passwordReset,
    orderPaymentSuccess: orderPaymentSuccess,
    orderPaymentLink: orderPaymentLink
};
