var mongoose = require('./db').mongoose;
var user = require('./handlers.user');
var order = require('./handlers.order');
var payment = require('./handlers.payment');
var stats = require('./handle.stats');
var fileActions = require('./db.gridfs').actions;



var _ = require('lodash');
//var path = require("path");
//var request = require('request');
//var configureTemplateRoutes = require('../templates/templates').configure;
var createController = require('./handler.actions').create;

exports.configure = function(app) {

    //    configureTemplateRoutes(app);

    /*
        app.get('/html/email', (req, res) => {
            var html = getFile('../templates/email.html');
            res.json({html:html});
        });
    */

    app.get('/email/test', (req, res) => {
        var html = getFile('../templates/email.html');
        html = S(html).replaceAll('$PASSWORD', 123)
            .replaceAll('$URL', process.env.adminURL || 'http://localhost:3000/admin')
            .s;
        res.json({ r: html });
        return;
        var data = {
            html: html,
            from: 'admin@diags.com',
            to: 'arancibiajav@gmail.com',
            subject: 'Your order is created #2'
        };

        sendEmail(data, (r) => {
            res.json(r);
        })

    });




    user.routes(app);
    order.routes(app);


    app.get('/ctrl/:controller/:action', function(req, res) {
        var controller = req.params.controller;
        var action = req.params.action;
        var data = req.params;
        var actions = createController(controller);
        if (controller == 'User') {
            Object.assign(actions, user.actions);
        }
        if (controller == 'Order') {
            Object.assign(actions, order.actions);
        }
        if (controller == 'File') {
            Object.assign(actions, fileActions);
        }

        data.__req = req;
        actions[action](data, actions.result(res, data));
    });

    app.post('/ctrl/:controller/:action', function(req, res) {
        var controller = req.params.controller;
        var action = req.params.action;
        var data = req.body;

        if(req.get('content-type').indexOf('multipart/form-data') !== -1){
            console.log('ctrl.post:type (FORM)'+req.get('content-type'));
            data = Object.assign(data||{},req.form||{});
        }else{
            console.log('ctrl.post:type '+req.get('content-type'));
        }

        var actions = {};

        //if (_.includes(['User', 'Order'], controller)) {
        actions = createController(controller);
        //}

        if (controller == 'User') {
            Object.assign(actions, user.actions);
        }
        if (controller == 'Order') {
            Object.assign(actions, order.actions);
        }
        if (controller == 'Payment') {
            Object.assign(actions, payment.actions);
        }
        if (controller == 'Stats') {
            Object.assign(actions, stats.actions);
        }

        if (controller == 'File') {
            Object.assign(actions, fileActions);
        }

        actions[action](data, actions.result(res),req,res);
    });

    app.post('/File/save/',(req,res)=>{
        var actions = Object.assign(createController('File'),fileActions);
        actions.save({
            //name:req.params.name,
            //order:req.params.order
        },actions.result(res),req,res);
    });

    app.get('/File/get/:_id', (req, res) => {
        fileActions.get({ _id: req.params._id }, (err, data) => {
            res.setHeader('Content-disposition', 'attachment; filename=' + data.filename);
            //res.setHeader('Content-Type', data.contentType );
            res.setHeader('Content-Type', 'application/pdf');
            
            data.stream.pipe(res);
        });
    });

    app.post('/custom', function(req, res) {
        var d = req.body;
        mongoose.model(d.model)[d.action](d.data, function(err, result) {
            res.json({
                ok: !err,
                message: err || 'Everithing ok',
                result: result
            });
        });
    });


    console.log('routes-loaded');
};
