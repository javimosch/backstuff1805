var express = require('express');

var bodyParser = require('body-parser')
var bb = require('express-busboy');
var busboy = require('connect-busboy');
var path = require("path");
var inspect = require('util').inspect;
var fs = require('fs');
require('./model/db');
var configureRoutes = require('./model/app.routes').configure;
var configureProgrammedTasks = require('./model/programmedTasks').configure;
var app = express();
var port = process.env.PORT || 5000;
var LOCAL = process.env.LOCAL && process.env.LOCAL.toString() == '1' || false;
var config = JSON.parse(fs.readFileSync(process.cwd() + '/package.json'));
var apiMessage = 'Backstuff runing version ' + config.version + '!';
//
//
//CORS
app.all('*', function(req, res, next) {
    console.log(req.method);
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT,DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if ('OPTIONS' == req.method) {
        return res.send(200);
    }
    next();
});
//PARSE DATA
app.use(busboy());
app.use(function(req, res, next) {
    if (req.busboy) {
        req.busboy.on('field', function(key, value, keyTruncated, valueTruncated) {
            console.log('field', key, value, keyTruncated, valueTruncated);
        });
    }
    next();
});
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(bodyParser.json());
//ROOT
app.get('/', function(req, res) {
    res.json({
        messsage: apiMessage,
        support: config.author
    });
});
//ROUTES
configureRoutes(app);
//TASKS
configureProgrammedTasks(app);
//STATIC
app.use('/', express.static('./www'));
//START
app.listen(port, function() {
    console.log(apiMessage);
    console.log('adminURL' + process.env.adminURL);
    console.log('backstuff-API listening on port ' + port + '!');
});
