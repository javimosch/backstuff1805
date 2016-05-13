var Order = require('../model/db.actions').create('Order');
var User = require('../model/db.actions').create('User');
var Log = require('../model/db.actions').create('Log');
var statsActions = require('./ctrl.stats');
var template = require('../utils/template');
var sendEmail = require('../model/utils.mailing').sendEmail;
var moment = require('moment');
var btoa = require('btoa')
var _ = require('lodash');
var adminUrl = require('../model/utils').adminUrl;
var modelName = 'email';
var actions = {
    log: (m) => {
        console.log(modelName.toUpperCase() + ': ' + m);
    }
};

var EXPORT_ACTIONS = {

    ADMIN_ADMIN_ACCOUNT_CREATED             : ADMIN_ADMIN_ACCOUNT_CREATED,
    ADMIN_CLIENT_ACCOUNT_CREATED            : ADMIN_CLIENT_ACCOUNT_CREATED,
    ADMIN_DIAG_ACCOUNT_CREATED              : ADMIN_DIAG_ACCOUNT_CREATED,
    ADMIN_DIPLOME_EXPIRATION                : ADMIN_DIPLOME_EXPIRATION,
    ADMIN_NEW_CONTACT_FORM_MESSAGE          : ADMIN_NEW_CONTACT_FORM_MESSAGE,
    ADMIN_ORDER_PAYMENT_DELEGATED           : ADMIN_ORDER_PAYMENT_DELEGATED,
    ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS     : ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS,
    ADMIN_ORDER_PAYMENT_SUCCESS             : ADMIN_ORDER_PAYMENT_SUCCESS,
    
    CLIENT_CLIENT_NEW_ACCOUNT               : CLIENT_CLIENT_NEW_ACCOUNT,
    CLIENT_ORDER_DELEGATED                  : CLIENT_ORDER_DELEGATED,
    CLIENT_ORDER_PAYMENT_SUCCESS            : CLIENT_ORDER_PAYMENT_SUCCESS,
   
    DIAG_DIAG_ACCOUNT_CREATED               : DIAG_DIAG_ACCOUNT_CREATED,
    DIAG_NEW_RDV                            : DIAG_NEW_RDV,
    DIAG_RDV_CONFIRMED                      : DIAG_RDV_CONFIRMED,
    
    LANDLORD_ORDER_PAYMENT_DELEGATED:LANDLORD_ORDER_PAYMENT_DELEGATED,
    LANDLORD_ORDER_PAYMENT_SUCCESS: LANDLORD_ORDER_PAYMENT_SUCCESS,
    
    USER_PASSWORD_RESET: USER_PASSWORD_RESET,
    
    send: send, //calling this function directly is deprecated.
    test: () => {
        NotificationHandler.save({
            message: "test-notification-delete-now"
        }, (_notification) => {
            console.log('test-success');
        });
    }
};
module.exports = EXPORT_ACTIONS;



require('../controllers/ctrl.notification').init(EXPORT_ACTIONS);
var Notification = require('../model/db.actions').create('Notification');
var NotificationHandler = require('../controllers/ctrl.notification');
var NOTIFICATION = NotificationHandler.NOTIFICATION;


//console.log('EMAIL - NOTIFICATION',require('../actions/notification.actions'));
//console.log('EMAIL - NOTIFICATION',require('../actions/notification.actions').actions);

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
    return moment(d).format('HH[h]mm');
}

function dateTime(d) {
    return moment(d).format('DD-MM-YY HH[h]mm');
}

function ADMIN_NEW_CONTACT_FORM_MESSAGE(data, cb) {
    actions.log('ADMIN_NEW_CONTACT_FORM_MESSAGE=' + JSON.stringify(data));
    cb(null, "Send in progress"); //async op
    User.getAll({
        userType: 'admin'
    }, function(err, admins) {
        if (err) {
            return dblog('ADMIN_NEW_CONTACT_FORM_MESSAGE fail when retrieve admins. Details: ' + JSON.stringify(err));
        }
        admins.forEach(admin => {
            var _data = _.cloneDeep(data);
            _data._user = admin;
            ADMIN_NEW_CONTACT_FORM_MESSAGE_SINGLE(_data, function() {
                //no-log 
            });
        });
    });
}


function ADMIN_NEW_CONTACT_FORM_MESSAGE_SINGLE(data, cb) {
    actions.log('ADMIN_NEW_CONTACT_FORM_MESSAGE_SINGLE=' + JSON.stringify(data));
    //data = {_admin,_diag,}
    //vars: ADMIN_NAME DIAG_NAME DIAG_DIPLOME_FILENAME DIAG_EDIT_URL
    send({
        __notificationType: NOTIFICATION.ADMIN_NEW_CONTACT_FORM_MESSAGE,
        _user: data._user,
        to: data._user.email,
        subject: "Site contact form: new message",
        templateName: 'ADMIN_NEW_CONTACT_FORM_MESSAGE',
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

function ADMIN_DIPLOME_EXPIRATION(data, cb) {
    actions.log('ADMIN_DIPLOME_EXPIRATION=' + JSON.stringify(data));
    //data = {_admin,_diag,}
    //vars: ADMIN_NAME DIAG_NAME DIAG_DIPLOME_FILENAME DIAG_EDIT_URL
    send({
        __notificationType: data.__notificationType,
        _user: data._admin,
        to: data._admin.email,
        subject: "ATTENTION Diplôme Expiré",
        templateName: 'ADMIN_DIPLOME_EXPIRATION',
        templateReplace: {
            '$DIAG_NAME': data._diag.firstName,
            '$DIAG_MOBILE': data._diag.cellPhone,
            '$DIAG_DIPLOME_EXPIRATION_DATE': dateTime(data._info.expirationDate),
            '$DIAG_DIPLOME_FILENAME': data.filename,
            '$DIAG_EDIT_URL': adminUrl('/diags/edit/' + data._diag._id),
        },
        cb: () => {}
    }, cb);
}

function CLIENT_ORDER_CREATED(data, cb) {
    actions.log('CLIENT_ORDER_CREATED=' + JSON.stringify(_user));
    var _user = data._user;
    var _order = data._order;
    send({
        __notificationType: NOTIFICATION.CLIENT_ORDER_CREATED,
        _user: _user,
        to: _user.email,
        subject: "Bienvenue sur Diagnostical",
        templateName: 'CLIENT_ORDER_CREATED',
        templateReplace: {
            '$FIRSTNAME': _user.firstName || _user.email,
            '$LASTNAME': _user.firstName || _user.email,
            '$ORDER_URL': adminUrl('/orders/edit/' + _order._id),
            //'$ORDER_DESCR': _order.address + ' (' + time(_order.diagStart) + ' - ' + time(_order.diagEnd) + ')',
            //'$PASSWORD': _user.password || '[Contact support for the password]',
            //'$URL': adminUrl('?email=' + _user.email + '&k=' + btoa(_user.password))
        },
        cb: cb
    });
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

function DIAG_RDV_CONFIRMED(data, cb) {
    data._order.notifications = data._order.notifications || {};
    if (data._order.notifications.DIAG_RDV_CONFIRMED !== true) {
        var _subject = 'RDV confirmé: ' + data._order.address + '/' + dateTime(data._order.start);
        return DIAGS_USER_ORDER_CUSTOM(data, (err, r) => {
            data._order.notifications.DIAG_RDV_CONFIRMED = true;
            Order.update(data._order);
            cb && cb(err, r);
        }, _subject, 'DIAG_RDV_CONFIRMED', data._user.email, NOTIFICATION.DIAG_RDV_CONFIRMED);
    }
}

function DIAG_NEW_RDV(data, cb) {
    data._order.notifications = data._order.notifications || {};
    if (data._order.notifications.DIAG_NEW_RDV !== true) {
        var _subject = 'Nouveau RDV : ' + data._order.address + '/' + dateTime(data._order.start);
        return DIAGS_USER_ORDER_CUSTOM(data, (err, r) => {
            data._order.notifications.DIAG_NEW_RDV = true;
            Order.update(data._order);
            cb && cb(err, r);
        }, _subject, 'DIAG_NEW_RDV', data._user.email, NOTIFICATION.DIAG_NEW_RDV);
    }
}



function ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS(data, cb) {
    statsActions.currentMonthTotalRevenueHT({}, (_err, _currentMonthTotalRevenueHT) => {
        data._order.currentMonthTotalRevenueHT = _currentMonthTotalRevenueHT;
        var _subject = 'Paiement confirmé: ' + data._order.address + '/' + dateTime(data._order.start);
        return DIAGS_USER_ORDER_CUSTOM(data, cb, _subject, 'ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS', data._user.email, NOTIFICATION.ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS);
    });
}


function ADMIN_ORDER_PAYMENT_SUCCESS(data, cb) {
    statsActions.currentMonthTotalRevenueHT({}, (_err, _currentMonthTotalRevenueHT) => {
        data._order.currentMonthTotalRevenueHT = _currentMonthTotalRevenueHT;
        var _subject = 'Paiement confirmé: ' + data._order.address + '/' + dateTime(data._order.start);
        return DIAGS_USER_ORDER_CUSTOM(data, cb, _subject, 'ADMIN_ORDER_PAYMENT_SUCCESS', data._user.email, NOTIFICATION.ADMIN_ORDER_PAYMENT_SUCCESS);
    });
}

function ADMIN_ORDER_PAYMENT_DELEGATED(data, cb) {
    var _subject = dateTime(data._order.start)  + '/' + data._order.address   + " Paiement Délégué";
    return DIAGS_USER_ORDER_CUSTOM(data, cb, _subject, 'ADMIN_ORDER_PAYMENT_DELEGATED', data._user.email, NOTIFICATION.ADMIN_ORDER_PAYMENT_DELEGATED);
}

function CLIENT_ORDER_DELEGATED(data, cb) {
    var _subject = 'RDV en attente de paiement: ' + data._order.address + '/' + dateTime(data._order.start);
    return DIAGS_USER_ORDER_CUSTOM(data, cb, _subject, 'CLIENT_ORDER_DELEGATED', data._user.email, NOTIFICATION.CLIENT_ORDER_DELEGATED);
}

function CLIENT_ORDER_PAYMENT_SUCCESS(data, cb) {
    var _subject = 'RDV en attente de paiement: ' + data._order.address + '/' + dateTime(data._order.start);
    if (data._order.notifications.CLIENT_ORDER_PAYMENT_SUCCESS !== true) {
        return DIAGS_USER_ORDER_CUSTOM(data, (err, r) => {
            data._order.notifications.CLIENT_ORDER_PAYMENT_SUCCESS = true;
            Order.update(data._order);
            cb && cb(err, r);
        }, _subject, 'CLIENT_ORDER_PAYMENT_SUCCESS', data._order.landLordEmail, NOTIFICATION.CLIENT_ORDER_PAYMENT_SUCCESS);
    }
}


function LANDLORD_ORDER_PAYMENT_DELEGATED(data, cb) {
    var _subject = 'Diagnostic Réservé en attente de paiement';
    data._order.notifications = data._order.notifications || {};
    if (data._order.notifications.LANDLORD_ORDER_PAYMENT_DELEGATED !== true) {
        return DIAGS_USER_ORDER_CUSTOM(data, (err, r) => {
            data._order.notifications.LANDLORD_ORDER_PAYMENT_DELEGATED = true;
            Order.update(data._order);
            cb && cb(err, r);
        }, _subject, 'LANDLORD_ORDER_PAYMENT_DELEGATED', data._order.landLordEmail, NOTIFICATION.LANDLORD_ORDER_PAYMENT_DELEGATED);
    }
}

function LANDLORD_ORDER_PAYMENT_SUCCESS(data, cb) {
    var _subject = 'Rendez-vous confirmé';
    if (data._order.notifications.LANDLORD_ORDER_PAYMENT_SUCCESS !== true) {
        return DIAGS_USER_ORDER_CUSTOM(data, (err, r) => {
            data._order.notifications.LANDLORD_ORDER_PAYMENT_SUCCESS = true;
            Order.update(data._order);
            cb && cb(err, r);
        }, _subject, 'LANDLORD_ORDER_PAYMENT_SUCCESS', data._order.landLordEmail, NOTIFICATION.LANDLORD_ORDER_PAYMENT_SUCCESS);
    }
}

function DIAGS_USER_ORDER_CUSTOM(data, cb, _subject, templateName, _to, _type) {
    var _user = data._user;
    var _order = data._order;
    actions.log(_type + '=' + JSON.stringify({
        email: _user.email,
        _order: _order._id,
        price: _order.price
    }));
    send({
        __notificationType: _type,
        _user: _user,
        to: _to,
        subject: _subject,
        templateName: templateName,
        templateReplace: {
            '$USER_EMAIL': _user.email,
            '$USER_FIRSTNAME': _user.firstName,
            '$USER_LASTNAME': _user.lastName,
            '$CLIENT_COMPANY_NAME': _order._client.companyName,
            '$CLIENT_FULL_NAME': _order._client.firstName + ' ' + _order._client.lastName,
            '$CLIENT_FIRSTNAME': _order._client.firstName,
            '$CLIENT_PHONE_NUMBER': _order._client.cellPhone,
            '$CLIENT_EMAIL': _order._client.email,
            '$DIAG_EMAIL': _order._diag.email,
            '$DIAG_FULL_NAME': _order._diag.firstName + ' ' + _order._diag.lastName,
            '$DIAG_FIRSTNAME': _order._diag.firstName,
            '$DIAG_LASTNAME': _order._diag.lastName,
            '$LANDLORD_FULLNAME': _user.landLordFullName,
            '$LANDLORD_EMAIL': _user.landLordEmail,
            '$LANDLORD_PHONE': _user.landLordPhone,
            '$ORDER_DIAG_LIST': htmlOrderSelectedDiagsList(_order),
            '$ORDER_ADDRESS': _order.address,
            '$ORDER_KEYS_INFO': _order.keysAddress + ' / ' + dateTime(_order.keysTimeFrom) + ' - ' + time(_order.keysTimeFrom),
            '$ORDER_OBSERVATION': _order.obs,
            '$ORDER_PRICE_TTC': _order.price,
            '$ORDER_PRICE_HT': _order.priceHT,
            '$ORDER_DIAG_REMUNERATION_HT': _order.diagRemunerationHT,
            '$ORDER_REVENUE_HT': _order.revenueHT,
            '$ORDER_MONTH_REVENUE_HT': _order.currentMonthTotalRevenueHT,
            
            '$ORDER_DATE_HOUR': dateTime(_order.start),
            '$ORDER_DESCRIPTION': _order.info.description,
            '$ORDER_URL': adminUrl('/orders/edit/' + _order._id),
            '$ORDER_PUBLIC_URL': adminUrl('/orders/view/' + _order._id),
            //'$ORDER_DESCR': _order.address + ' (' + time(_order.diagStart) + ' - ' + time(_order.diagEnd) + ')',
        },
        cb: cb
    });
}

function htmlOrderSelectedDiagsList(_order) {
    var rta = "<ul>";
    Object.keys(_order.diags).forEach(key => {
        if (_order.diags[key]) {
            rta += "<li>" + key + "</li>";
        }
    })
    return rta + '</ul>';
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


function ADMIN_DIAG_ACCOUNT_CREATED(data, cb) {
    var _user = data._user;
    actions.log('ADMIN_DIAG_ACCOUNT_CREATED=' + JSON.stringify(_user));
    send({
        __notificationType: NOTIFICATION.ADMIN_DIAG_ACCOUNT_CREATED,
        _user: _user,
        to: data.adminEmail,
        subject: "Nouveau Diagnostiqueur",
        templateName: 'ADMIN_DIAG_ACCOUNT_CREATED',
        templateReplace: {
            '$EMAIL': _user.firstName,
            '$FIRSTNAME': _user.firstName,
            '$LASTNAME': _user.lastName,
            '$MOBILE': _user.cellPhone,
            '$EDIT_URL': adminUrl('/diags/edit/' + _user._id),
        },
        cb: cb
    });
}



function ADMIN_CLIENT_ACCOUNT_CREATED(data, cb) {
    var _client = data._client;
    var _admin = data._admin;
    actions.log('ADMIN_CLIENT_ACCOUNT_CREATED:start');
    send({
        __notificationType: NOTIFICATION.ADMIN_CLIENT_ACCOUNT_CREATED,
        _user: _admin,
        to: _admin.email,
        subject: "Nouveau client",
        templateName: 'ADMIN_CLIENT_ACCOUNT_CREATED',
        templateReplace: {
            '$ADMIN_FIRSTNAME'      : _admin.firstName,
            '$CLIENT_EMAIL'          : _client.email,
            '$CLIENT_COMPANY_NAME'  : _client.companyName,
            '$CLIENT_FIRSTNAME'     : _client.lastName,
            '$CLIENT_LASTNAME'      : _client.lastName,
            '$CLIENT_PHONE'         : _client.cellPhone,
            '$CLIENT_ADDRESS'       : _client.address,
            '$CLIENT_TYPE'          : _client.clientType,
            '$EDIT_URL'             : adminUrl('/clients/edit/' + _client._id),
        },
        cb: cb
    });
}

function ADMIN_ADMIN_ACCOUNT_CREATED(data, cb) {
    var _user = data;
    actions.log('ADMIN_ADMIN_ACCOUNT_CREATED=' + JSON.stringify(_user));
    send({
        __notificationType: NOTIFICATION.ADMIN_ADMIN_ACCOUNT_CREATED,
        _user: _user,
        to: _user.email,
        subject: "Your Admin Account is ready",
        templateName: 'ADMIN_ADMIN_ACCOUNT_CREATED',
        templateReplace: {
            '$FIRSTNAME': _user.firstName,
            '$LASTNAME': _user.lastName,
            '$PASSWORD': _user.password || '[Press reset password in the login screen]',
            '$BACKOFFICE_URL': adminUrl('login?email=' + _user.email + '&k=' + btoa(_user.password))
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

function DIAG_DIAG_ACCOUNT_CREATED(data, cb) {
    var _user = data;
    actions.log('DIAG_DIAG_ACCOUNT_CREATED=' + JSON.stringify(_user));
    actions.log('DIAG_DIAG_ACCOUNT_CREATED:NOTIFICATION=' + JSON.stringify(NOTIFICATION));
    send({
        __notificationType: NOTIFICATION.DIAG_DIAG_ACCOUNT_CREATED,
        _user: _user,
        to: _user.email,
        subject: "Vous êtes Diagnostiqueur sur Diagnostical !",
        templateName: 'DIAG_DIAG_ACCOUNT_CREATED',
        templateReplace: {
            '$FIRSTNAME': _user.firstName,
            '$LASTNAME': _user.lastName,
            '$BACKOFFICE_URL': process.env.adminURL || 'http://localhost:3000/admin?email=' + _user.email + '&k=' + btoa(_user.password)
        },
        cb: cb
    });
}

function CLIENT_CLIENT_NEW_ACCOUNT(data, cb) {
    var _user = data;
    actions.log('CLIENT_CLIENT_NEW_ACCOUNT=' + JSON.stringify(_user));
    actions.log('CLIENT_CLIENT_NEW_ACCOUNT:NOTIFICATION=' + JSON.stringify(NOTIFICATION));
    send({
        __notificationType: NOTIFICATION.CLIENT_NEW_ACCOUNT,
        _user: _user,
        to: _user.email,
        subject: "Bienvenue sur Diagnostical",
        templateName: 'CLIENT_CLIENT_NEW_ACCOUNT',
        templateReplace: {
            '$FIRSTNAME': _user.firstName,
            '$LASTNAME': _user.lastName,
            '$BACKOFFICE_URL': adminUrl('login?email=' + _user.email + '&k=' + btoa(_user.password))
        },
        cb: cb
    });
}



function USER_PASSWORD_RESET(data, cb) {
    var _user = data;
    actions.log('USER_PASSWORD_RESET=' + JSON.stringify(_user));
    send({
        __notificationType: NOTIFICATION.USER_PASSWORD_RESET,
        _user: _user,
        to: _user.email,
        subject: "Password reset",
        templateName: 'USER_PASSWORD_RESET',
        templateReplace: {
            '$NAME': _user.firstName || _user.email,
            '$PASS': _user.password || '[Contact support for the password]',
            '$URL': process.env.adminURL || 'http://localhost:3000/admin?email=' + _user.email + '&k=' + btoa(_user.password)
        },
        cb: cb
    });
}
