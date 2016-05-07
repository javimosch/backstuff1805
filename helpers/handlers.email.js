//var Order = mongoose.model('Order');
//var User = mongoose.model('User');

var NotificationHandler     = require('../actions/notification.actions').actions;
var NOTIFICATION                   = require('../actions/notification.actions').NOTIFICATION;

//console.log('HANDLERS.EMAIL',JSON.stringify(Object.keys(NotificationHandler)));


var Order = require('./handler.actions').create('Order');
var User = require('./handler.actions').create('User');
var Log = require('./handler.actions').create('Log');
var UserNotifications = require('./handler.actions').create('UserNotifications');
var Notification = require('./handler.actions').create('Notification');
var template = require('../utils/template');
var sendEmail = require('./utils.mailing').sendEmail;
var moment = require('moment');


var btoa = require('btoa')
var _ = require('lodash');

var adminUrl = require('./utils').adminUrl;

var modelName = 'email';
var actions = {
    log: (m) => {
        console.log(modelName.toUpperCase() + ': ' + m);
    }
};

exports.actions = {
    NEW_CONTACT_FORM_MESSAGE: NEW_CONTACT_FORM_MESSAGE,
    NEW_CONTACT_FORM_MESSAGE: NEW_CONTACT_FORM_MESSAGE,
    DIPLOME_EXPIRATION: DIPLOME_EXPIRATION,
    CLIENT_NEW_ACCOUNT: CLIENT_NEW_ACCOUNT,
    DIAG_NEW_ACCOUNT: DIAG_NEW_ACCOUNT,
    ADMIN_NEW_ACCOUNT: ADMIN_NEW_ACCOUNT,
    ORDER_CREATED: ORDER_CREATED,
    PASSWORD_RESET: PASSWORD_RESET,
    ORDER_PAYMENT_SUCCESS: ORDER_PAYMENT_SUCCESS,
    PAYMENT_LINK: PAYMENT_LINK,
    ORDER_CONFIRMED_FOR_INVOICE_END_OF_THE_MONTH: ORDER_CONFIRMED_FOR_INVOICE_END_OF_THE_MONTH,
    send: send, //calling this function directly is deprecated.
};




function dummySuccessResponse(cb) {
    actions.log('dummySuccessResponse:cb=' + JSON.stringify(cb));
    var rta = {
        ok: true,
        message: 'Success (Mailing disabled)'
    };
    if (cb) {
        cb(null, rta);
    }
    else {
        actions.log('dummySuccessResponse:rta:(no-cb)=' + JSON.stringify(rta));
    }
}

function send(opt, resCb) {
    actions.log('send:start=' + JSON.stringify(opt));
    var html = opt.html || template(opt.templateName, opt.templateReplace);
    if (opt.subject) {
        if (opt.subject.indexOf('Diag Project') == -1) {
            opt.subject = 'Diag Project | ' + opt.subject;
        }
    }
    var data = {
        type: opt.__notificationType,
        html: html,
        from: process.env.emailFrom || 'diags-project@startup.com',
        to: opt.to || process.env.emailTo || 'arancibiajav@gmail.com',
        subject: opt.subject
    };
    if (opt._user) {
        if (opt._notification) {
            actions.log('send:using-_notification=' + JSON.stringify(opt._notification));
            Notification.getById({
                _id: opt._notification
            }, (err, _notification) => {
                if (err) {
                    return dblog('notification getById fail in function send');
                }
                validateSending(_notification);
            });
        }
        else {
            actions.log('send:saving-notification');
            data._user = opt._user;
            NotificationHandler.save(data, (_notification) => {
                if (_notification) {
                    _notification.__populate = {
                        _config: 'disabledTypes'
                    }
                    actions.log('send:using-_notification=' + JSON.stringify(_notification));
                    validateSending(_notification);
                }
            });
        }

        function validateSending(_notification) {
            actions.log('send:validateSending=' + JSON.stringify(_notification));
            Notification.getById(_notification, (err, _notification) => {
                if (err) {
                    return dblog('notification getById fail in function send');
                }
                if (!_.includes(_notification._config.disabledTypes, _notification.type)) {

                    if (process.env.disableMailing === '1') {
                        actions.log('send:mailing-disabled');
                        _notification.sended = true;
                        Notification.update(_notification, (err, _notification) => {
                            if (err) dblog('notification sended update fail in function send.');

                            if (resCb) resCb(null, {
                                message: 'Success (Mailing disabled)',
                                ok: true
                            });

                        });
                        return dummySuccessResponse(opt.cb);
                    }
                    else {
                        _send(_notification);
                    }


                }
                else {

                    if (opt.cb) {
                        return opt.cb(null, {
                            ok: true,
                            message: 'Notification type disabled'
                        })
                    }

                    if (resCb) {
                        resCb('SENDING_DISABLED_TYPE', "");
                    }
                }
            });
        }

    }
    else {
        if (process.env.disableMailing === '1') return dummySuccessResponse(opt.cb);
        _send();
    }

    function _send(_notification) {
        actions.log('send:real-sending');
        sendEmail(data, (err, r) => {
            actions.log('send:real-sending:rta: ' + JSON.stringify(r));

            if (!err && _notification) {
                _notification.sended = true;
                Notification.update(_notification, (err, _notification) => {
                    if (err) dblog('notification sended update fail in function send.');

                    if (resCb) resCb(null, r);

                });
            }
            if (opt.cb) {
                opt.cb(err, r);
            }
            if (err) {
                dblog('sendEmail fail, the data was ' + JSON.stringify(data));
            }
        });
    }
}

function time(d) {
    return moment(d).format('HH:mm');
}

function NEW_CONTACT_FORM_MESSAGE(data, cb) {
    actions.log('NEW_CONTACT_FORM_MESSAGE=' + JSON.stringify(data));
    cb(null, "Send in progress"); //async op
    User.getAll({
        userType: 'admin'
    }, function(err, admins) {
        if (err) {
            return dblog('NEW_CONTACT_FORM_MESSAGE fail when retrieve admins. Details: ' + JSON.stringify(err));
        }
        admins.forEach(admin => {
            var _data = _.cloneDeep(data);
            _data._user = admin;
            NEW_CONTACT_FORM_MESSAGE_SINGLE(_data, function() {
                //no-log 
            });
        });
    });
}


function NEW_CONTACT_FORM_MESSAGE_SINGLE(data, cb) {
    actions.log('NEW_CONTACT_FORM_MESSAGE_SINGLE=' + JSON.stringify(data));
    //data = {_admin,_diag,}
    //vars: ADMIN_NAME DIAG_NAME DIAG_DIPLOME_FILENAME DIAG_EDIT_URL
    send({
        __notificationType: data.__notificationType,
        _user: data._user,
        to: data._user.email,
        subject: "Site contact form: new message",
        templateName: 'contact-form',
        templateReplace: {
            '$USER_NAME': data._user.firstName || data._user.email,
            '$CLIENT_NAME': data.fullname,
            '$CLIENT_EMAIL': data.email,
            '$CLIENT_PHONE': data.phone,
            '$CLIENT_MESSAGE': data.message
        },
        cb: () => {}
    }, cb);
}

function DIPLOME_EXPIRATION(data, cb) {
    actions.log('DIPLOME_EXPIRATION=' + JSON.stringify(data));
    //data = {_admin,_diag,}
    //vars: ADMIN_NAME DIAG_NAME DIAG_DIPLOME_FILENAME DIAG_EDIT_URL
    send({
        __notificationType: data.__notificationType,
        _user: data._admin,
        to: data._admin.email,
        subject: "Diag diplome expiration",
        templateName: 'diplome.expiration',
        templateReplace: {
            '$ADMIN_NAME': data._admin.firstName || data._admin.email,
            '$DIAG_NAME': data._diag.firstName || data._diag.email,
            '$DIAG_DIPLOME_FILENAME': data.filename,
            '$DIAG_EDIT_URL': adminUrl('/diags/edit/' + data._diag._id),
        },
        cb: () => {}
    }, cb);
}

function ORDER_CREATED(data, cb) {
    actions.log('ORDER_CREATED=' + JSON.stringify(_user));
    var _user = data._user;
    var _order = data._order;
    send({
        __notificationType: data.__notificationType,
        _user: _user,
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
function PAYMENT_LINK(data, cb) {
    var _order = data;
    actions.log('PAYMENT_LINK=' + JSON.stringify(_order));
    if (typeof _order._client === 'string') {
        if (_order._id) return cb("_id required");
        actions.log('PAYMENT_LINK:updating-order');
        return Order.update(_order, () => {
            _order.__populate = {
                _client: 'email firstName lastName'
            };
            actions.log('PAYMENT_LINK:fetching-order');
            Order.getById(_order, _send);
        });
    }
    else {
        _send(null, _order);
    }

    function _send(err, _order) {
        if (err) return cb(err, _order);
        actions.log('PAYMENT_LINK:sending..');
        send({
            __notificationType: data.__notificationType,
            _user: _order._client,
            to: _order.landLordEmail,
            subject: "Payment delegation notification",
            templateName: 'agency.payment-link',
            templateReplace: {
                '$NAME': _order.landLordFullName || _order.landLordEmail,
                '$AGENCY': _order._client.firstName || _order._client.email,
                '$ORDER_DESCRIPTION': _order.address + ' (' + time(_order.diagStart) + ' - ' + time(_order.diagEnd) + ')',
                '$ORDER_AMOUNT': _order.price,
                '$ORDER_PAY_LINK': adminUrl('/orders/view/' + _order._id)
            },
            cb: (err, r) => {
                actions.log('PAYMENT_LINK:sended!');
                return cb(err, r);
            }
        });
    }
}

function ORDER_CONFIRMED_FOR_INVOICE_END_OF_THE_MONTH(data, cb) {
    var _user = data._user;
    var _order = data._order;
    actions.log('ORDER_CONFIRMED_FOR_INVOICE_END_OF_THE_MONTH=' + JSON.stringify({
        email: _user.email,
        _order: _order._id,
        price: _order.price
    }));
    send({
        __notificationType: NOTIFICATION.ORDER_CONFIRMED_FOR_INVOICE_END_OF_THE_MONTH,
        _user: _user,
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

function ORDER_PAYMENT_SUCCESS(data, cb) {
    var _user = data._user;
    var _order = data._order;
    actions.log('ORDER_PAYMENT_SUCCESS=' + JSON.stringify({
        email: _user.email,
        _order: _order._id,
        price: _order.price
    }));
    send({
        __notificationType: NOTIFICATION.ORDER_PAYMENT_SUCCESS,
        _user: _user,
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


function DIAG_NEW_ACCOUNT(data, cb) {
    var _user = data;
    actions.log('DIAG_NEW_ACCOUNT=' + JSON.stringify(_user));
    send({
        __notificationType: NOTIFICATION.DIAG_NEW_ACCOUNT,
        _user: _user,
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

function ADMIN_NEW_ACCOUNT(data, cb) {
    var _user = data;
    actions.log('ADMIN_NEW_ACCOUNT=' + JSON.stringify(_user));
    send({
        __notificationType: NOTIFICATION.ADMIN_NEW_ACCOUNT,
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
    Log.save({
        message: msg,
        type: type
    });
}



function CLIENT_NEW_ACCOUNT(data, cb) {
    var _user = data;
    actions.log('CLIENT_NEW_ACCOUNT=' + JSON.stringify(_user));
    actions.log('CLIENT_NEW_ACCOUNT:NOTIFICATION=' + JSON.stringify(NOTIFICATION));
    send({
        __notificationType: NOTIFICATION.CLIENT_NEW_ACCOUNT,
        _user: _user,
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



function PASSWORD_RESET(data, cb) {
    var _user = data;
    actions.log('PASSWORD_RESET=' + JSON.stringify(_user));
    send({
        __notificationType: NOTIFICATION.PASSWORD_RESET,
        _user: _user,
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
