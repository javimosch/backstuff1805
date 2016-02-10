var user = require('./handlers.user');
var test = require('./handlers.testing');
var inspector = require('./handlers.inspector');
var order = require('./handlers.order');

exports.configure = function(app){
  
  
  
    app.post('/login', user.login);
    app.post('/newcat', test.newCat);
    
    app.post('/save/inspector', inspector.save);
    app.post('/get/inspector', inspector.get);
    app.get('/getAll/inspector', inspector.getAll);
    
    app.post('/save/order', order.save);
  
  
    console.log('Routes loaded.');
};