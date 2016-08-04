var ctrl = require('./db.controller').create;
module.exports = {
    model: {
        getAccessToken: getAccessToken,
        getClient:getClient,
        grantTypeAllowed:grantTypeAllowed,
        getUser:getUser,
        saveAccessToken:saveAccessToken
    }, // See below for specification 
    grants: ['password'],
    debug: true
};

function getAccessToken(bearerToken, callback) {
    var Token = ctrl('OAUTH_Token');
    Token.get({
        value:bearerToken
    },(err,_token)=>{
        if(err) return callback(err);
       callback(null,_token && _token.value); 
    });
}

function getClient(clientId, clientSecret, callback) {
    var Client = ctrl('OAUTH_Client');
    var payload = {
        _id: clientId
    };
    if (clientSecret) {
        payload.keySecret = clientSecret;
    }
    Client.get(payload, (err,_client)=>{
        if(err) return callback(err);
        if(_client){
            _client.clientId = _client._id;
        }
        callback(null,_client);
    });
}

function grantTypeAllowed(clientId, grantType, callback) {
    //callback: error, allowed (bool)
    var Client = ctrl('OAUTH_Client');
    Client.get({
        _id: clientId,
        __rules:{
            grants:grantType
        }
    }, (err, client) => {
        if (err) return callback(err);
        callback(null,client!=null);
    });
}

function saveAccessToken (accessToken, clientId, expires, user, callback){
    console.log('saveAccessToken',accessToken, clientId, expires, user);
    var Token = ctrl('OAUTH_Token');
    Token.save({
        value:accessToken,
        clientId:clientId,
        userId:user.id,
        expires:expires,
    },callback);
}


function getUser (username, password, callback){
    //requires: user.id
    ctrl('User').get({
        email:username,
        pwd:password
    },(err,_user)=>{
        if(err) return callback(err);
        if(_user){
            _user.id = _user._id;
        }
        return callback(null,_user);
    });
}
