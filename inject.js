 var express = require('express');
 var bodyParser = require('body-parser')
 var bb = require('express-busboy');
 var busboy = require('connect-busboy');
 var path = require("path");
 var inspect = require('util').inspect;
 var fs = require('fs');
 var port = process.env.PORT || 5000;
 var LOCAL = process.env.LOCAL && process.env.LOCAL.toString() == '1' || false;
 var apiMessage = null;
 var https = require('https');
 var http = require('http');
 //
 function configure(app, chdir) {
     var _cwd = process.cwd();
     if (chdir) {
         console.log('bs debug cwd changing', chdir);
         process.chdir(chdir);
         console.log('bs debug cwd change to ', process.cwd());
     }
     else {
         console.log('bs debug cwd do not change');
     }
     var config = JSON.parse(fs.readFileSync(process.cwd() + '/package.json'));
     apiMessage = 'Backstuff runing version ' + config.version + '!';
     require('./model/db');
     var configureRoutes = require('./model/app.routes').configure;
     var configureProgrammedTasks = require('./model/tasks').configure;
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
     app.get('/api', function(req, res) {
         res.json({
             messsage: apiMessage,
             support: config.author
         });
     });
     //ROUTES
     configureRoutes(app);
     //DIRS
     var ensureDirectory = (path) => {
         if (!fs.existsSync(path))
             fs.mkdirSync(path);
     }
     ensureDirectory(process.cwd() + '/www');
     ensureDirectory(process.cwd() + '/www/temp');


     //TASKS
     configureProgrammedTasks(app);

     //STATIC
     app.use('/api/wwww', express.static('./www'));
     process.chdir(_cwd);
     console.log('bs debug cwd back to ', process.cwd());
 }
 //START
 exports.configure = configure;
