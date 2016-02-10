var mongoose= require('./db').mongoose;
var generatePassword = require("password-maker");
var Client  = mongoose.model('Client'); 
var promise = require('./utils').promise;
var validate = require('./validator').validate;
var handleMissingKeys = require('./validator').handleMissingKeys;

function handleError(res,err){
    res.json({message:"Server error",detail:err});
}

function exists(_id){
    return promise(function(resolve,error){
        if(_id){
            Client.find({_id:{$eq:data._id}},function(err,r){
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
    console.log('CLIENT:SAVE:VALIDATING');
    validate(data,['email']).error(function(keys){
        console.log('CLIENT:SAVE:VALIDATING:FAIL');
        return handleMissingKeys(keys,callback);
    }).then(_check);
    function _check(){
        console.log('CLIENT:SAVE:CHECK');
         exists(data._id).then(_save).error(function(){
            _save(undefined);
        });  
     }  
    function _save(instance){
        instance = instance || new Client(data);
        instance.type = data.type || instance.type;
        instance.address = data.address || instance.address;
        instance.tel = data.tel || instance.tel;
        instance.siret = data.siret || instance.siret;
        instance.discount = data.discount || instance.discount;
        instance.email = data.email || null;
        instance.password = data.password || generatePassword(8);
        console.log('CLIENT:SAVE:SAVING');
        instance.save(function(err,instance){
            if(err) return handleError(err);
            console.log('CLIENT:SAVE:SAVING:SUCCESS');
            callback({message:'Save success',result:instance});
        });
    }
}
function getAll(callback){
     Client.find(function(err,r){
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
    save:save
};


exports.get = function (req,res){
    var data = req.body;
     Diagnostiqueur.find({_id:{$eq:data._id}},function(err,r){
         if(err) handleError(err);
        if(r && r.length>=1){
            res.json({message:'Retrieved success',item:r[0]});
        }else{
            res.json({message:'Retrieved failed. Item not found.',item:null});
        } 
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



