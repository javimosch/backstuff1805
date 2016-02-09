var user = require('./handlers.user');
var test = require('./handlers.testing');
var inspector = require('./handlers.inspector');

exports.configure = function(app){
  
  
  
    app.post('/login', user.login);
    app.post('/newcat', test.newCat);
    
    app.post('/save/inspector', inspector.save);
    app.post('/get/inspector', inspector.get);
    app.get('/getAll/inspector', inspector.getAll);
  
  
    console.log('Routes loaded.');
};