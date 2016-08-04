var ctrl = require('../model/db.controller').create;
var mongoose = require('../model/db').mongoose;
var generatePassword = require("password-maker");
var actions = require('../model/db.actions').create('User');
var Log = require('../model/db.actions').create('Log');
var Notif = require('./ctrl.notification');
var NOTIFICATION = Notif.NOTIFICATION;
var utils = require('../model/utils');
module.exports = {
    get: get, //replace
    login: login,
    passwordReset: passwordReset,
    save: save
};

function login(data, cb) {
    console.log('User:login=' + JSON.stringify(data));
    actions.model.findOne(actions.toRules({
        email: data.email,
        pwd: data.pwd
    })).exec((err,res)=>{
        if(err)return cb(err,res);
        
        //save login event
        if(res && res._id){
            res.loggedAt = Date.now();
            res.save();
        }
        
        
        cb(err,res);
    });
}


function passwordReset(data, cb) {
    actions.check(data, ['email'], (err, r) => {
        if (err) return cb(err, r);
        actions.get({
            email: data.email
        }, (err, _user) => {
            if (err) return cb(err, _user);
            if (_user) {

                _user.pwd = generatePassword(8);
                _user.save();

                Notif.trigger('GAB_USER_PASSWORD_RESET', {
                    _user: _user
                }, (err, r) => {
                    return cb(err, r);
                })


            }
        })
    });
}

function get(data, cb) {
    var User = ctrl('User');
    var Order = ctrl('Order');
    actions.get(data, (err, _user) => {
        if (err) return cb(err);
        if(!_user) return cb(err,_user);
        Order.getAll({
            _biker: _user._id,
            __select: "debriefing",
            __rules: {
                status: {
                    $eq: "completed"
                }
            }
        }, (err, _orders) => {
            if (err) return cb(err);

            
                var stats = {
                    completed: _orders.length,
                    negativeReviews: _orders.filter(_order => _order.debriefing && _order.debriefing.biker && _order.debriefing.biker.score == 1).length,
                    neutralReviews: _orders.filter(_order => _order.debriefing && _order.debriefing.biker && _order.debriefing.biker.score == 2).length,
                    positiveReviews: _orders.filter(_order => _order.debriefing && _order.debriefing.biker && _order.debriefing.biker.score == 3).length
                };
            
            _user.stats = stats;
            console.log('debug user info', JSON.stringify(stats));
            return cb(null, _user);
        });

    });
}

function save(data, cb) {
    actions.createUpdate(data, cb, {
        email: data.email,
        pwd: data.pwd
    }, ['pwd', 'email']).on('created', (_err, _user) => {
        Notif.trigger(NOTIFICATION.GAB_USER_NEW_ACCOUNT, {
            _user: _user
        });
        everyAdmin((err, _admin) => {
            if (err) return cb && cb(err) || utils.LogSave(JSON.stringify(err), 'error', err);
            Notif.trigger(NOTIFICATION.GAB_ADMIN_USER_NEW_ACCOUNT, {
                _user: _user,
                _admin: _admin
            });
        })
    });
}

function everyAdmin(cb) {
    ctrl('User').getAll({
        userType: 'admin'
    }, (err, _admins) => {
        if (err) return cb(err);
        _admins.forEach((_admin) => {
            cb(null, _admin);
        });
    });
}