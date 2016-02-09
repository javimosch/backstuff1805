var user = require('./handlers.user');
var test = require('./handlers.testing');

exports.configure = function(app){
  
  
  
    app.post('/login', user.login);
    app.post('/newcat', test.newCat);
  
  
    console.log('Routes loaded.');
};