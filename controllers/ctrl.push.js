//backtuff-getabiker
//AIzaSyD1LzHybVe80jExLmzdZnERU8GmONLb5ls
//AIzaSyDw9JfL6zhyNi3sLncJdoLTzl0d61tPfGY

//echo '{"title": "Push Test","message":"Hola Boludo"}' | curl -d @- https://maerp-javoche.c9users.io:8081/ctrl/push/all

var ctrl = require('../model/db.controller').create;
var key = 'AIzaSyDw9JfL6zhyNi3sLncJdoLTzl0d61tPfGY'; 
var stratton = require('stratton');
var gcm = require('node-gcm');

module.exports = {
    single: single,
    all: all
};



function single(data, cb) {
    console.log('debug push single ', JSON.stringify(data));

    var id = 'cyIrbzA3FuQ:APA91bG1JDtPaiX2kRadM1gJcGdaVxShaupu-LSe4M7K5PFYEf1_cwZNsAoVSqDlSC2zmSqQl1IaiDBuMVB6Va0bLI1JMkcO8Vjbae7Xm78KBmy_WBUlsc_G3nuTjVtOoUaU97TjHNyc';

    var data = {
        title: 'My First Push',
        message: 'Powered by stratton',
        otherfields: 'add more fields if you want'
    };

    var message = new gcm.Message({
        data: {
            title: 'My First Push',
            message: 'Powered by stratton',
        }
    });
    var sender = new gcm.Sender(key);
    var regTokens = [id];
    sender.send(message, {
        registrationTokens: regTokens
    }, function(err, response) {
        cb(!err ? null : err, response);
    });

    /*
        data.pushId = id;
        console.log('debug push payload', JSON.stringify(data));
        stratton.sendPush(data, function(result) {
            console.log(result);
            cb(result == true ? null : result, true);
        });*/

}


function all(data, cb) {
    var Device = ctrl('Device');
    Device.getAll({}, (err, _devices) => {
        if (err) return cb(err);
        var ids = _devices.map(_d => _d.registrationId);
        console.log('debug push ids ',JSON.stringify(ids));
        var sender = new gcm.Sender('AIzaSyBKPKqoCjcaqLWH5cnc8lDSP4hefiFYnv0');
        var regTokens = ids;
        var message = new gcm.Message({
            data: data
        });
        
        sender.send(message, {
            registrationTokens: regTokens
        }, function(err, response) {
            cb(!err ? null : err, response);
        });
        /*
        data.pushId = ids;
        stratton.sendPush(data, function(result) {
            cb(result ? null : result, result);
        });*/
        
        
    });
}