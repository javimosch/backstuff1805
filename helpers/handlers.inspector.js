var mongoose= require('./db').mongoose;

var Diagnostiqueur  = mongoose.model('Diagnostiqueur'); 


function handleError(res,err){
    res.json({message:"Server error",detail:err});
}

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
     Diagnostiqueur.find(function(err,r){
         if(err) handleError(err);
        if(r && r.length>=1){
            res.json({message:'Retrieved success',result:r});
        }else{
            res.json({message:'Retrieved failed. Item not found.',result:[]});
        } 
    });
};

exports.save = function (req, res) {
    var data = req.body;
    
    if(data._id){
        Diagnostiqueur.find({_id:{$eq:data._id}},function(err,r){
            if(r && r.length>=1){
                _save(r[0]);
            }else{
                _save();
            } 
        });
    }else{
        _save();
    }
    function _save(instance){
        instance = instance || new Diagnostiqueur(data);
        for(var x in data){
            instance[x] = data[x];
        }
        instance.save(function(err,r){
            if(err) handleError(err);
            res.json({message:'Save success',post:data});
        });
    }
    
};



