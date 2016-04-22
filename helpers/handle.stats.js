var mongoose = require('./db').mongoose;
var moment = require('moment');
var promise = require('./utils').promise;
var _ = require('lodash');
var generatePassword = require("password-maker");
var validate = require('./validator').validate;
var handleMissingKeys = require('./validator').handleMissingKeys;
var User = require('./handler.actions').create('User');
var Order = require('./handler.actions').create('Order');

function cbHell(quantity, cb) {
    return {
        call: () => cb(),
        next: () => {
            quantity--;
            if (quantity === 0) cb();
        }
    }
}

function general(data, cb) {
    var rta = {};

    function _users() {
        User.model.count({
            userType: 'client'
        }, (err, nroClients) => {
            if(err) cb(null,rta);
            rta.nroClients = nroClients;
            User.model.count({
                userType: 'diag'
            }, (err, nroDiags) => {
                if(err) cb(null,rta);
                rta.nroDiags = nroDiags;
                User.model.count({
                    userType: 'client',
                    clientType: 'landlord'
                }, (err, nro) => {
                    if(err) cb(null,rta);
                    rta.nroLandlords = nro;
                    rta.nroAgencies = nroClients - rta.nroLandlords;
                    _orders();
                });
            });
        });
    }



    function _orders() {
        var _handler = cbHell(5, () => {
            cb(null, rta);
        });
        
        Order.model.count({
            status: 'created'
        }, (err, nro) => {
            if(err) cb(null,rta);
            rta.nroOrdersCreated = nro;
            _handler.next();
        });

        Order.model.count({
            status: 'ordered'
        }, (err, nro) => {
            if(err) cb(null,rta);
            rta.nroOrdersOrdered = nro;
            _handler.next();
        });

        Order.model.count({
            status: 'prepaid'
        }, (err, nro) => {
            if(err) cb(null,rta);
            rta.nroOrdersPrepaid = nro;
            _handler.next();
        });

        Order.model.count({
            status: 'delivered'
        }, (err, nro) => {
            if(err) cb(null,rta);
            rta.nroOrdersDelivered = nro;
            _handler.next();
        });

        Order.model.count({
            status: 'completed'
        }, (err, nro) => {
            if(err) cb(null,rta);
            rta.nroOrdersCompleted = nro;
            _handler.next();
        });


    }

    _users();
}




exports.actions = {
    general: general
};
