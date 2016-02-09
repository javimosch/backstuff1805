var mongoose= require('./db');


exports.login = function (req, res) {
  var logged = req.body.email = 'jla@asd.com' && req.body.pass == 'asd';
  var message = logged && "Logged success" || "Logged Failed";
  res.json({logged:logged,message:message});
};