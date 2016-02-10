var promise = require('./utils').promise;

function validate(data,keys){
    return promise(function(resolve,error){
        var missingKeys = [];
        keys.forEach(function(v,k){
            if(typeof data[v] === 'undefined' || data[v] === null){
                missingKeys.push(v);
            }
        }); 
        if(missingKeys.length>0){
            error(missingKeys);
        }else{
            resolve();
        }
    });
}

function handleMissingKeys(keys,callback){
   callback({ok:false,message:"Missing keys",result:keys});
}

exports.handleMissingKeys = handleMissingKeys;
exports.validate = validate;