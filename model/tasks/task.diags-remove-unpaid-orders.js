var name = 'task:diags-remove-unpaid-orders';
var _ = require('lodash');
var moment = require('moment');
var ctrl = require('../db.controller').create;
var fs = require('fs');
var path = require('path');
var LogSave = (msg, data, type) => ctrl('Log').save({
    message: msg,
    type: type || 'error',
    data: data
});
module.exports = {
    name: name,
    interval: 1000 * 60 * 10, //each minutes
    handler: handler,
    startupInterval: true,
    startupIntervalDelay: 1000,
};

var CANCEL_MOTIVES = {
    WHEN_PASSED_WITHOUT_ASSIGNMENT: 'WHEN_PASSED_WITHOUT_ASSIGNMENT',
    TIME_WITHOUT_ASSIGNATION_EXCEEDED: 'TIME_WITHOUT_ASSIGNATION_EXCEEDED'
};

function handler(data, cb) {
    //console.log('remove-unpaid-orders', 'start');
    //
    var Order = ctrl('Order');
    Order.getAll({
        status: "created"
    }, (err, orders) => {
        console.log('bs debug task orders get-all success', !err);
        if (err) return LogSave(name + " error", err);
        orders.forEach(_order => {
            console.log('bs debug task order id', _order._id);
            if (Date.now() - new Date(_order.updatedAt) > 1000 * 60 * 30 ) { //milli sec min
                console.log('bs debug task order cancel');

                _order.info = _order.info || {};
                _order.status = 'canceled';
                _order.info.cancelMotiveCode = CANCEL_MOTIVES.TIME_WITHOUT_ASSIGNATION_EXCEEDED;

                Order.update(_order, (err) => {
                    console.log('bs debug task order canceled success', !err);
                    if (err) return LogSave(name + " error", err);

                    LogSave('Unassigned order canceled.', _order, 'info');
                });

                /*
                 Order.remove(_order, (err) => {
                     console.log('bs debug task order remove success', !err);
                     if (err) return LogSave(name + " error", err);

                     LogSave('Unpaid order removed.', _order, 'info');
                 });*/
            }
        })
    });
    //
    //console.log('remove-unpaid-orders', 'end');
}
