var mongoose            = require('./db').mongoose;
var userActions         = require('./handlers.user').actions;
var orderActions        = require('./handlers.order').actions;
var paymentActions      = require('./stripeService').actions;
var statsActions        = require('./handle.stats').actions;
var fileActions         = require('./db.gridfs').actions;
var emailActions        = require('./handlers.email').actions;
var textActions         = require('../actions/text.actions').actions;
var stripeActions       = require('../actions/stripe.actions').actions;
var notificationActions = require('../actions/notification.actions').actions;
var NOTIFICATION        = require('../actions/notification.actions').NOTIFICATION;
var _                   = require('lodash');
var createController = require('./handler.actions').create;
//
exports.configure = function(app) {
    app.post('/ctrl/:controller/:action', function(req, res) {
        var controller = req.params.controller;
        var action = req.params.action;
        var data = req.body;

        var actions = {};

        //if (_.includes(['User', 'Order'], controller)) {
        actions = createController(controller);
        //}

        if (controller == 'User') {
            Object.assign(actions, userActions);
        }
        if (controller == 'Order') {
            Object.assign(actions, orderActions);
        }
        if (controller == 'Payment') {
            Object.assign(actions, paymentActions);
        }
        if (controller == 'Stats') {
            Object.assign(actions, statsActions);
        }

        if (controller == 'File') {
            Object.assign(actions, fileActions);
        }

        if (controller == 'Email') {
            Object.assign(actions, emailActions);
        }
        
        if (controller == 'Text') {
            Object.assign(actions, textActions);
        }

        if (controller == 'Stripe') {
            Object.assign(actions, notificationActions);
        }
        
        if (controller == 'Notification') {
            Object.assign(actions, stripeActions);
        }

        if(actions[action]){
            actions[action](data, actions.result(res),req,res);
        }else{
            actions.model[action](actions.toRules(data), actions.result(res),req,res);
        }
    });

    app.post('/File/save/',(req,res)=>{
        var actions = Object.assign(createController('File'),fileActions);
        actions.save({
            //name:req.params.name,
            //order:req.params.order
        },actions.result(res),req,res);
    });

    app.get('/File/get/:_id', (req, res) => {
        fileActions.get({ _id: req.params._id }, (_err, data) => {
            res.setHeader('Content-disposition', 'attachment; filename=' + data.filename);
            //res.setHeader('Content-Type', data.contentType );
            res.setHeader('Content-Type', 'application/pdf');
            
            data.stream.pipe(res);
        });
    });

   
    console.log('ROUTING-OK');
};
