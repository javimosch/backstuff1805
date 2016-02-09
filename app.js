var express = require('express');
var cors = require('express-cors')
var bodyParser = require('body-parser')


require('./helpers/db');
var configureRoutes = require('./helpers/routes').configure;

var app = express();
app.use(bodyParser());

var LOCAL = process.env.LOCAL && process.env.LOCAL.toString() == '1' || false;
var allowedOrigins = [];

if(LOCAL){
    allowedOrigins.push('*','*localhost:*','*localhost');
}

console.log('Using allowedOrigins:',allowedOrigins);

app.use(cors({
	allowedOrigins: allowedOrigins
}))
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT,DELETE');
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if ('OPTIONS' == req.method){
        return res.send(200);
    }
    next();
});

app.get('/', function (req, res) {
  res.json({messsage:'Hello World!'});
});

configureRoutes(app);

var port = process.env.PORT || 3535;
app.listen(port, function () {
  console.log('Example app listening on port '+port+'!');
});

