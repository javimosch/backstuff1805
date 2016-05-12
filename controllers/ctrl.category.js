var ctrl = require('../model/db.controller');
module.exports = {
    agrupar: (data, cb) => {
        
        ctrl.$User.model.count({userType:'admin'},(err,r)=>{
            console.log('agrupar-res',err,r);
        });
        
        console.log('category-agrupar-success');
    }
};