


exports.login = function (req, res) {
  var logged = req.body.email = 'jla@asd.com' && req.body.pass == 'asd';
  var message = logged && "Login success" || "Incorrect Login/Password";
  res.json({logged:logged,message:message});
};



