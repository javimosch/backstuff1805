var Notification = require('../helpers/handler.actions').create('Notification');
var UserNotifications = require('../helpers/handler.actions').create('UserNotifications');
var User = require('../helpers/handler.actions').create('User');
var Order = require('../helpers/handler.actions').create('Order');
var Log = require('../helpers/handler.actions').create('Log');
var EmailHandler = require('../helpers/handlers.email').actions;
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
    ORDER_CREATED: 'ORDER_CREATED',
    CLIENT_NEW_ACCOUNT: 'CLIENT_NEW_ACCOUNT',
    DIAG_NEW_ACCOUNT: 'DIAG_NEW_ACCOUNT',
    ADMIN_NEW_ACCOUNT: 'ADMIN_NEW_ACCOUNT',
    NEW_CONTACT_FORM_MESSAGE: 'NEW_CONTACT_FORM_MESSAGE', //notif_newContactFormMessage,
    PAYMENT_LINK: 'PAYMENT_LINK',
    ORDER_CONFIRMED_FOR_INVOICE_END_OF_THE_MONTH: 'ORDER_CONFIRMED_FOR_INVOICE_END_OF_THE_MONTH',
    ORDER_PAYMENT_SUCCESS: 'ORDER_PAYMENT_SUCCESS',
    DIPLOME_EXPIRATION: 'DIPLOME_EXPIRATION',
    PASSWORD_RESET: 'PASSWORD_RESET'
};

Object.keys(NOTIFICATION).forEach(KEY => {
    exports[KEY] = (data, cb) => trigger(KEY, data, cb);
});

exports.NOTIFICATION = NOTIFICATION;
exports.actions = {
    trigger,
    save
};

function trigger(name, data, cb) {
    actions.log('trigger=' + JSON.stringify(data));
    if (!name)                  return cb("name required");
    if (!NOTIFICATION[name])    return cb("trigger notification not found: " + name);
    actions.log('trigger:routing-'+name+'=' + JSON.stringify(data));
    data.__notificationType = name;
    return EmailHandler[name](data, cb);
}



function save(data, cb) {
    var _user = data._user;
    var _user = _user.id  || _user;
    if (!_user || !_user._id) {
        Log.save('notification-save user-not-found');
        if(!cb) return;
        else return cb("notification-save user-not-found");
    }

    //data: html,from,to,subject
    UserNotifications.get({
        _user: _user
    }, (err, _config) => {
        if (err) return Log.save('UserNotifications getById fail for user ' + _user.email);
        if (!_config) {
            //dblog("UserNotifications not found for " + _user.email + '.', 'info');
            UserNotifications.create({
                _user: _user._id
            }, (err, _config) => {
                if (err) return Log.save('UserNotifications create fail for user ' + _user.email);
                saveNotificationOn(_config);
            })
        }
        else {
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
            if (err) return Log.save('saveNotification fail when creating a notification for user ' + _user.email);
            if (cb) cb(_notification);

            _config.notifications.push(_notification);
            _config.save();
        });
    }
}


console.log('NOTIFICATION.ACTIONS=EXPORTS',JSON.stringify(Object.keys(exports)));
//console.log('NOTIFICATION.ACTIONS / NOTIFICATION / DEBUG = ',JSON.stringify(Object.keys(exports.NOTIFICATION)));