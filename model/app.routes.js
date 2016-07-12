var mime = require('mime-types')
var mongoose = require('./db').mongoose;
var _ = require('lodash');
var dbController = require('./db.controller');

//
exports.configure = function(app) {

    console.log('ROUTES configure');

    try {
        require('../config/config.' + process.env.APPNAME.toString().toLowerCase()).controllers(dbController);
        console.log('ROUTES reading config',process.env.APPNAME);
    }
    catch (e) {
        console.log('ERROR', 'Loading config controllers fail for project', process.env.APPNAME);
    }

    var NOTIFICATION = dbController.create("Notification").NOTIFICATION;
    var Log = dbController.create("Log");
    var File = dbController.create('File')
        //
    app.get('/ctrl/:controller/:action/:data', function(req, res) {
        var controller = req.params.controller;
        var action = req.params.action;
        var data = req.params.data;
        var actions = dbController.create(controller);
        if (!actions[action]) {
            var msg = '<p>Invalid controller ' + controller + " action " + action + '</p>';
            console.log(msg);
            console.log('Available for', controller, JSON.stringify(Object.keys(actions)));
            res.set('Content-Type', 'text/html');
            res.send(new Buffer(msg));
        }
        else {
            return actions[action](data, actions.result(res), req, res);
        }
    });

    app.post('/ctrl/:controller/:action', function(req, res) {
        var controller = req.params.controller;
        var action = req.params.action;
        var data = req.body;
        //
        console.log('routes:ctrl:start');
        console.log('routes:ctrl:controller', controller);
        console.log('routes:ctrl:action', action);
        //
        var actions = dbController.create(controller);
        if (!actions[action] && !actions.model[action]) {
            var cb = actions.result(res);
            console.log('routes:ctrl:invalid-action-aborting', action);
            Log.save({
                message: 'Invalid post ctrl action "' + action + '" detected on controller ' + controller,
                type: 'error'
            });
            return cb("action-not-found:" + action);
        }
        //
        if (actions[action]) {
            console.log('routes:ctrl:calling', action);
            actions[action](data, actions.result(res), req, res);
        }
        else {
            console.log('routes:ctrl:model-calling', action);
            actions.model[action](actions.toRules(data), actions.result(res), req, res);
        }

        //console.log('routes:ctrl:end');
    });

    app.post('/File/save/', (req, res) => {
        File.save({}, File.result(res), req, res);
    });

    app.get('/File/get/:_id', (req, res) => {
        File.get({
            _id: req.params._id
        }, (_err, data) => {

            // res.setHeader('Content-disposition', 'attachment; filename=' + data.filename);
            // res.setHeader('Content-Type', 'application/pdf');

            res.setHeader("content-type", "application/pdf");
            res.setHeader('Content-disposition', ' filename=' + (data.filename || 'file') + '.pdf');

            data.stream.pipe(res);
        });
    });


    console.log('ROUTING-OK');
};
