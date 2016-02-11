var user = require('./handlers.user');
var test = require('./handlers.testing');
var diag = require('./handlers.diag');
var order = require('./handlers.order');
var client = require('./handlers.client');
var user = require('./handlers.user');

exports.configure = function(app) {




    app.post('/newcat', test.newCat);

    app.post('/diag/save', diag.save);
    app.post('/diag/get', diag.get);
    app.post('/diag/getAll', diag.getAll);
    app.post('/diag/remove', diag.remove);
    app.post('/diag/removeAll', diag.removeAll);

    app.post('/client/save', client.save);
    app.post('/client/get', client.get);
    app.post('/client/getAll', client.getAll);
    app.post('/client/remove', client.remove);
    app.post('/client/removeAll', client.removeAll);


    app.post('/user/login', user.login);
    app.post('/user/save', user.save);
    app.post('/user/get', user.get);
    app.post('/user/getAll', user.getAll);
    app.post('/user/remove', user.remove);
    app.post('/user/removeAll', user.removeAll);


    app.post('/order/save', order.save);

    console.log('Routes loaded.');
};
