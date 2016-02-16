var mongoose = require('./db').mongoose;
var user = require('./handlers.user');
var order = require('./handlers.order');
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
        html = S(html).replaceAll('$PASSWORD',123)
               .replaceAll('$URL',process.env.adminURL || 'http://localhost:3000/admin')
               .s;
        res.json({r:html});
        return;
        var data = {
            html : html,
            from:'admin@diags.com',
            to:'arancibiajav@gmail.com',
            subject:'Your order is created #2'
        };

        sendEmail(data,(r)=>{
            res.json(r);    
        })
        
    });




    user.routes(app);
    order.routes(app);


    app.get('/ctrl/:controller/:action',function(req,res){
        var controller = req.params.controller;
        var action = req.params.action;
        var data = req.body;
        var actions = createController(controller);
        actions[action](data,actions.result(res));
    });

    app.post('/ctrl/:controller/:action',function(req,res){
        var controller = req.params.controller;
        var action = req.params.action;
        var data = req.body;
        var actions = createController(controller);
        actions[action](data,actions.result(res));
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
