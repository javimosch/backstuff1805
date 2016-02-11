var mongoose= require('./db').mongoose;
var moment  = require('moment');
var promise = require('./utils').promise;
var _ = require('lodash');

var validate = require('./validator').validate;
var handleMissingKeys = require('./validator').handleMissingKeys;

var ClientActions = require('./handlers.client').actions;
var Order  = mongoose.model('Order'); 


function handleError(res,err){
    res.json({ok:false,message:"Server error",detail:err});
}




//ACTIONS

function exists(_id){
    return promise(function(resolve,error){
        if(_id){
            Order.find({_id:{$eq:_id}},function(err,r){
                if(r && r.length>=1){
                    resolve(r[0]);
                }else{
                    error();
                } 
            });
        }else{
            error();
        }
    });
}

function save(data,callback){
    console.log('ORDER:SAVE:BEGIN');
    validate(data,['inspectorId','diagFrom','diagTo','diags','address','price','time']).error(function(keys){
        console.log('ORDER:SAVE:VALIDATIONS:FAIL');
        return handleMissingKeys(keys,callback);
    }).then(_check);
    
    function _check(){
        console.log('ORDER:SAVE:CHECK');
        //check: si no existe clientId buscamos email para generar un cliente.data.
        if(_.isUndefined(data.clientId)){
            if(_.isUndefined(data.email) || _.isNull(data.email) || data.email === ''){
                console.log('ORDER:SAVE:CHECK:FAIL:ClientId or Email required');
                callback({ok:false,message:"clientId or email required."});
            }else{
                data.createdAt = new Date();
                console.log('ORDER:SAVE:CHECK:saving new client');
                //action: create a client from email
                ClientActions.save({email:data.email},function(client){
                    console.log('ORDER:SAVE:CHECK:saving:new:client:ok');
                    //check: create or update order
                    data.clientId = client._id;
                    exists(data._id).then(_save).error(function(){
                        _save(undefined);
                    });            
                });
            }    
        }else{
            console.log('ORDER:SAVE:CHECK:ClientId-Found:saving');
            //check: create or update order
            exists(data._id).then(_save).error(function(){
                _save(undefined);
            });    
        }
    }
    
    
    function _save(instance){
        instance = instance || new Order(data);
        instance.clientId = data.clientId || instance.clientId;
        instance.inspectorId = data.inspectorId; //REQUIRED inspectorId
        var hours = moment(data.diagFrom).hours();
        var min = moment(data.diagTo).minutes();
        var date = moment(data.date).hours(hours).minutes(min);
        instance.diags = data.diags;//REQUIRED diags
        instance.date = date;
        instance.address = data.address;//REQUIRED address
        instance.createdAt = data.createdAt || instance.createdAt || new Date();
        instance.updatedAt = new Date();
        instance.status = data.status || "ordered";
        instance.price = data.price || instance.price;//REQUIRED price
        instance.info = data.info  || instance.info;
        instance.obs = data.obs = "" || instance.obs;
        instance.time = data.time || instance.time;//REQUIRED time
        instance.comission = data.comission || instance.comission || 0;
        instance.pdfId = data.pdfId || instance.pdfId || null;
        /*
        status:
            - ordered //just created 
            - prepaid //client paid first. When upload pdf -> complete
            - delivered // PDF uploaded first. When client paid -> complete
            - complete
        */
        console.log('ORDER:SAVE:SAVING');
        instance.save(function(err,r){
            if(err) return handleError(err);
            console.log('ORDER:SAVE:SUCCESS');
            callback({message:'Save success',post:data});
        });
    }
}
function getSingle(data,callback){
     Order.find({_id:{$eq:data._id}},function(err,r){
         if(err) handleError(err);
        if(r && r.length>=1){
            res.json({message:'Retrieved success',item:r[0]});
        }else{
            res.json({message:'Retrieved failed. Item not found.',item:null});
        } 
    });
}
function getAll(callback){
     Order.find(function(err,r){
         if(err) handleError(err);
        if(r && r.length>=1){
            callback({message:'Retrieved success',result:r});
        }else{
            callback({message:'Retrieved failed. Item not found.',result:[]});
        } 
    });
}


exports.actions = {
    getAll:getAll,
    save:save,
    get:getSingle
};

exports.get = function (req,res){
    get(req.body,function(result){
        res.json(result);
    });
};

exports.getAll = function (req,res){
    getAll(function(rta){
       res.json(rta) ;
    });
};

exports.save = function (req, res) {
    var data = req.body;
    save(data,function(result){
        res.json(result);
    });
};





