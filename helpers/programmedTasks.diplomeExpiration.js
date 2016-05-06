var _ = require('lodash');
var moment = require('moment');
var User = require('./handler.actions').create('User');
var Order = require('./handler.actions').create('Order');
var name = 'diplomeExpirationCheck';
var Log = require('./handler.actions').create('Log');
var Email = require('./handlers.email').actions;
var log = (m) => {
    console.log(name + ': ' + m);
    return name + ': ' + m;
}
var dblog = (msg, type) => Log.save({ message: msg, type: type });

function handler(data,cb) {
    log('retrieve diags in progress');
    User.getAll({
        userType: 'diag'
    }, (err, r) => {
        if (err) return dblog(log('Fail to retreive diags.'));
        log('retrieve diags ok');
        var filename,info;
        r.forEach(diag => {
            if (_.isUndefined(diag.diplomesInfo)) {
                log(diag.email + ' diplomesInfo undefined.');
            } else {
                //expirationDateNotificationEnabled
                //expirationDateNotificationSended
                //filename
                //expirationDate
                //obtentionDate
                Object.keys(diag.diplomesInfo).forEach((id) => {
                	info = diag.diplomesInfo[id];
                    filename = info.filename || 'unkown-file-name (' + id + ' = ' + JSON.stringify(info) + ')';
                    //
                    if (_.isUndefined(info.expirationDateNotificationEnabled)) {
                        log(diag.email + ' ' + filename + ' expirationDateNotificationEnabled field required.');
                    } else {
                        if (_.isUndefined(info.expirationDate)) {
                            log(diag.email + ' ' + filename + ' expirationDate field required.');
                        } else {
                            if (moment().diff(moment(info.expirationDate), 'days') < 31) {
                                if (!_.isUndefined(info.expirationDateNotificationSended) && info.expirationDateNotificationSended === true) {
                                    console.log(diag.email + ' ' + filename + ' alert already sended.');
                                } else {
                                    User.getAll({
                                        userType: 'admin'
                                    }, (err, admins) => {
                                        if (err) {
                                            return dblog(log('Fai lto retrieve admins.'));
                                        } else {
                                            admins.forEach(_admin => {
                                                sendEmail(_admin, diag, info, id);
                                            });
                                        }
                                    });
                                }
                            }
                        }
                    }
                });
            }
        });
    });
}

function sendEmail(_admin, _diag, _info, _diplomeId) {
    Email.diplomeExpiration({
        _admin: _admin,
        _diag: _diag,
        filename: _info.filename,
    }, (err, r) => {
        if (err) return dblog(log('Fail when sending alert email to ' + _admin.email));
        dblog(log('Email sended to ' + _admin.email), 'success');
        //
        _info.expirationDateNotificationSended = true;
        _diag.diplomesInfo[_diplomeId] = _info;
        //
        User.update(_diag, (err, r) => {
            if (err) return dblog(log('Fail when updating expirationDateNotificationSended on ' + _diag.email));
        });
    });
}

module.exports = {
    name: name,
    interval: 1000 * 60 * 60, //each hour
    handler: handler
};
