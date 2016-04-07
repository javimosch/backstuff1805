var express = require('express');
var cors = require('express-cors')
var bodyParser = require('body-parser')
var bb = require('express-busboy');
var busboy = require('connect-busboy');
var path    = require("path");
var inspect = require('util').inspect;

require('./helpers/db');
var configureRoutes = require('./helpers/handle.routes').configure;
var configureProgrammedTasks = require('./helpers/programmedTasks').configure;

var app = express();

app.use(busboy());
app.use(function(req, res,next) {
   
  if (req.busboy) {
    //req.busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        //console.log('file',fieldname,inspect(file),filename,encoding,mimetype);
    //});
    req.busboy.on('field', function(key, value, keyTruncated, valueTruncated) {
        console.log('field',key,value,keyTruncated,valueTruncated);
    });
    //req.pipe(req.busboy).on('close',(a,b,c)=>{console.log('close',a,b,c)});
  }
  next();
});

/*
app.use(function(req,res,next){
    var ct = req.get('content-type');
    if(ct && ct.indexOf('multipart/form-data') !== -1)return next();
    return bodyParser.json()(req,res,next);
});

app.use(function(req,res,next){
    var ct = req.get('content-type');
    if(ct && ct.indexOf('multipart/form-data') !== -1)return next();
    return bodyParser.urlencoded({ extended: true })(req,res,next);
});
*/

app.use(bodyParser.urlencoded({ extended: true }))
/*
bb.extend(app,{
    upload:true,
    path: path.join(__dirname+'/uploads')
});*/
app.use(bodyParser.json());




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
configureProgrammedTasks(app);



var port = process.env.PORT || 5000;
app.listen(port, function () {
  console.log('Example app listening on port '+port+'!');
});

