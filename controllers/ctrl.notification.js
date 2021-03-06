var ctrl = require('../model/db.controller').create;
var Notification = require('../model/db.actions').create('Notification');
//var UserNotifications = require('../model/db.actions').create('UserNotifications');
//var User = require('../model/db.actions').create('User');
var Order = require('../model/db.actions').create('Order');
var Log = require('../model/db.actions').create('Log');

var EmailHandler = null; // require('../helpers/handlers.email').actions;
var moment = require('moment');
var S = require('string');
var btoa = require('btoa')
var _ = require('lodash');
var modelName = 'notification';
var actions = {
    log: (m) => {
        console.log(modelName.toUpperCase() + ': ' + m);
    }
};

var NOTIFICATION = {

    GAB_USER_PASSWORD_RESET: 'GAB_USER_PASSWORD_RESET',
    GAB_USER_NEW_ACCOUNT: 'GAB_USER_NEW_ACCOUNT',
    GAB_ADMIN_USER_NEW_ACCOUNT: 'GAB_ADMIN_USER_NEW_ACCOUNT',
    GAB_ADMIN_CONTACT_FORM: 'GAB_ADMIN_CONTACT_FORM',
    GAB_USER_BIKER_FEATURE_REQUEST:'GAB_USER_BIKER_FEATURE_REQUEST',

    BA_ADMIN_CONTACT_FORM: 'BA_ADMIN_CONTACT_FORM',

    ADMIN_ADMIN_ACCOUNT_CREATED: 'ADMIN_ADMIN_ACCOUNT_CREATED',
    ADMIN_CLIENT_ACCOUNT_CREATED: 'ADMIN_CLIENT_ACCOUNT_CREATED',
    ADMIN_DIAG_ACCOUNT_CREATED: 'ADMIN_DIAG_ACCOUNT_CREATED',
    ADMIN_DIPLOME_EXPIRATION: 'ADMIN_DIPLOME_EXPIRATION',
    ADMIN_NEW_CONTACT_FORM_MESSAGE: 'ADMIN_NEW_CONTACT_FORM_MESSAGE', //notif_newContactFormMessage,
    ADMIN_ORDER_PAYMENT_DELEGATED: 'ADMIN_ORDER_PAYMENT_DELEGATED',
    ADMIN_ORDER_PAYMENT_SUCCESS: 'ADMIN_ORDER_PAYMENT_SUCCESS',
    ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS: 'ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS',

    CLIENT_CLIENT_NEW_ACCOUNT: 'CLIENT_CLIENT_NEW_ACCOUNT',
    CLIENT_ORDER_CREATED: 'CLIENT_ORDER_CREATED',
    CLIENT_ORDER_PAYMENT_SUCCESS: 'CLIENT_ORDER_PAYMENT_SUCCESS',
    CLIENT_ORDER_DELEGATED: 'CLIENT_ORDER_DELEGATED',

    DIAG_DIAG_ACCOUNT_CREATED: 'DIAG_DIAG_ACCOUNT_CREATED',
    DIAG_NEW_RDV: 'DIAG_NEW_RDV',
    DIAG_RDV_CONFIRMED: 'DIAG_RDV_CONFIRMED',

    LANDLORD_ORDER_PAYMENT_DELEGATED: 'LANDLORD_ORDER_PAYMENT_DELEGATED',
    LANDLORD_ORDER_PAYMENT_SUCCESS: 'LANDLORD_ORDER_PAYMENT_SUCCESS',

    USER_PASSWORD_RESET: 'USER_PASSWORD_RESET'
};

var _actions = {
    trigger: trigger,
    save: save,
    NOTIFICATION: NOTIFICATION,
    init: (_EmailHandler) => {
        EmailHandler = _EmailHandler;
    }
};
Object.keys(NOTIFICATION).forEach(KEY => {
    _actions[KEY] = (data, cb) => trigger(KEY, data, cb);
});

module.exports = _actions;

function LogSave(msg, type, data) {
    Log.save({
        message: msg,
        type: type || 'error',
        data: data
    });
}

function trigger(name, data, cb) {
    // try {
    actions.log('trigger=' + JSON.stringify(data));
    if (!name) return cb && cb("name required");
    if (!NOTIFICATION[name]) {
        LogSave('Notification trigger name not found: ' + name, 'error', data);
        return cb && cb("trigger notification not found: " + name);
    }
    actions.log('trigger:routing-' + name + '=' + JSON.stringify(data));
    data.__notificationType = name;
    
    //return EmailHandler[name](data, cb);
    
    return ctrl('Email')[name](data,cb);
    
    //}
    // catch (e) {
    //    LogSave(e,'error',e);
    //    return cb && cb(e);
    // }
}



function save(data, cb) {
    Notification.create({
        _user: data._user,
        type: data.type || 'no-type',
        to: data.to || 'not-specified',
        subject: data.subject || 'not specified',
        contents: data.html || '',
    }, (err, _notification) => {
        if (err) return LogSave('NOTIFICATION save error', 'error', err);
        if (cb) cb(_notification);
    });
}


//console.log('NOTIFICATION = EXPORTS',JSON.stringify(Object.keys(module.exports)));
//console.log('NOTIFICATION.ACTIONS / NOTIFICATION / DEBUG = ',JSON.stringify(Object.keys(exports.NOTIFICATION)));