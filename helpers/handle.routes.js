//require('../actions/notification.actions');

var notificationActions = require('../actions/notification.actions').actions;
var NOTIFICATION        = require('../actions/notification.actions').NOTIFICATION;

var mongoose            = require('./db').mongoose;
var userActions         = require('./handlers.user').actions;
var orderActions        = require('./handlers.order').actions;
var paymentActions      = require('./stripeService').actions;
var statsActions        = require('./handle.stats').actions;
var fileActions         = require('./db.gridfs').actions;
var emailActions        = require('./handlers.email').actions;
var textActions         = require('../actions/text.actions').actions;
var stripeActions       = require('../actions/stripe.actions').actions;

var _                   = require('lodash');
var createController = require('./handler.actions').create;
var Log = createController("Log");
//
exports.configure = function(app) {
    
    
    app.post('/ctrl/:controller/:action', function(req, res) {
        var controller = req.params.controller;
        var action = req.params.action;
        var data = req.body;

        var actions = {};
        actions = createController(controller);
        var specialActions = {};

        if (controller == 'User') {
            specialActions = userActions;
        }
        if (controller == 'Order') {
            specialActions =orderActions;
        }
        if (controller == 'Payment') {
            specialActions = paymentActions;
        }
        if (controller == 'Stats') {
            specialActions = statsActions;
        }

        if (controller == 'File') {
            specialActions = fileActions;
        }

        if (controller == 'Email') {
            specialActions = emailActions;
        }
        
        if (controller == 'Text') {
            specialActions = textActions;
        }

        if (controller == 'Stripe') {
            specialActions = stripeActions;
        }
        
        if (controller == 'Notification') {
            specialActions = notificationActions;
        }
        
        
        console.log('routes:ctrl:start');
        console.log('routes:ctrl:controller',controller);
        console.log('routes:ctrl:action',action);
       // console.log('routes:ctrl:special-actions',specialActions);
        //console.log('routes:ctrl:available-actions',Object.keys(actions));

        Object.assign(actions, specialActions);
        
        if(!actions[action] && !actions.model[action]){
            var cb = actions.result(res);
            console.log('routes:ctrl:invalid-action-aborting',action);
            Log.save({
                message:'Invalid post ctrl action "'+action+'" detected on controller '+ controller,
                type:'error'
            });
            return cb("action-not-found:"+action);
        }

        if(actions[action]){
            console.log('routes:ctrl:calling',action);
            actions[action](data, actions.result(res),req,res);
        }else{
            console.log('routes:ctrl:model-calling',action);
            actions.model[action](actions.toRules(data), actions.result(res),req,res);
        }
        
        console.log('routes:ctrl:end');
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
