var pathName = {};
function create(name) {
    //DB ACTIONS
    var actions = require('./db.actions').create(name)
    if (actions._configure && !actions._configuredFlag) {
        actions._configuredFlag = true
        console.log(name.toUpperCase() + ": Configure");
        actions._configure(actions._hook);
    }
    //CUSTOM ACTIONS
    var ctrlName = name.toLowerCase();
    if(pathName[name]){
        ctrlName = pathName[name];
        console.log('DB.CONTROLLER READING CUSTOM PATH',name,ctrlName);
    }
    var path = path || 'controllers/ctrl.' + ctrlName;
    var specialActions = require(process.cwd() + '/' + path);
    //console.log('db.controller '+ name + ' special actions are '+JSON.stringify(Object.keys(specialActions)));
    return Object.assign(actions, specialActions);
}
var EXPORT = {
    path:(n,p)=>{
        pathName[n]=p;  
    },
    create: create
};
module.exports = EXPORT;