var user = require('./handlers.user');
var test = require('./handlers.testing');
var inspector = require('./handlers.inspector');
var order = require('./handlers.order');
var client = require('./handlers.client');

exports.configure = function(app){
  
  
  
    app.post('/login', user.login);
    app.post('/newcat', test.newCat);
    
    app.post('/inspector/save', inspector.save);
    app.post('/inspector/get', inspector.get);
    app.get('/inspector/getAll', inspector.getAll);

    app.post('/client/save', client.save);
    app.post('/client/get', client.get);
    app.post('/client/getAll', client.getAll);
    app.post('/client/remove', client.remove);
    app.post('/client/removeAll', client.removeAll);


    app.post('/save/order', order.save);

    console.log('Routes loaded.');
};