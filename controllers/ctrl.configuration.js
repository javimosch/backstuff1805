var ctrl = require('../model/db.controller').create;
var mongoose = require('../model/db').mongoose;
var generatePassword = require("password-maker");
var actions = require('../model/db.actions').create('Configuration');
var Log = require('../model/db.actions').create('Log');
var Notif = require('./ctrl.notification');
var NOTIFICATION = Notif.NOTIFICATION;
var utils = require('../model/utils');
module.exports = {
    getByCode: getByCode,
    getPaths:getPaths
};

function getPaths(data,cb){
    cb(null,actions.schema.paths);
}

function getByCode(data, cb) {
    if (!data.code) return cb("code required");
    actions.get({
        code: data.code
    }, cb);
}

//utils.LogSave(JSON.stringify(err), 'error', err)
