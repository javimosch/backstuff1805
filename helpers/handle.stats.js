var mongoose = require('./db').mongoose;
var moment = require('moment');
var promise = require('./utils').promise;
var _ = require('lodash');
var generatePassword = require("password-maker");
var validate = require('./validator').validate;
var handleMissingKeys = require('./validator').handleMissingKeys;
var User = require('./handler.actions').create('User');
var Order = require('./handler.actions').create('Order');


function general(data, cb) {
    var rta = {};

    function _users() {
        User.model.count({
            userType: 'client'
        }, (err, nroClients) => {
            rta.nroClients = nroClients;
            User.model.count({
                userType: 'diag'
            }, (err, nroDiags) => {
                rta.nroDiags = nroDiags;
                User.model.count({
                    userType: 'client',
                    clientType: 'landlord'
                }, (err, nro) => {
                    rta.nroLandlords = nro;
                    rta.nroAgencies = nroClients - rta.nroLandlords;
                    _orders();
                });
            });
        });
    }

    function _orders() {
        Order.model.count({
            status: 'ordered'
        }, (err, nro) => {
            rta.nroOrdersOrdered = nro;
            Order.model.count({
                status: 'prepaid'
            }, (err, nro) => {
                rta.nroOrdersPrepaid = nro;
                Order.model.count({
                    status: 'delivered'
                }, (err, nro) => {
                    rta.nroOrdersDelivered = nro;
                    Order.model.count({
                        status: 'completed'
                    }, (err, nro) => {
                        rta.nroOrdersCompleted = nro;
                        cb(null,rta);
                    });
                });
            });
        });
    }

    _users();
}




exports.actions = {
    general: general
};
