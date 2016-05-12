var createDbActions = require('./db.actions').create;
var actions = {};
function register(name,path){
    path = path ||  'controllers/ctrl.'+name.toLowerCase();
    actions[name] = require(process.cwd()+'/'+path);
    console.log('db.controller '+name+" register "+Object.keys(actions[name]).length+" actions.");
    //console.log('db.controller '+name+' register the following actions '+JSON.stringify(Object.keys(actions[name])));
    EXPORT['$'+name] = create(name);
}
function create(name){
    if(EXPORT['$'+name]) return EXPORT['$'+name];
    //
    var specialActions = actions[name]||{};
    //console.log('db.controller '+ name + ' special actions are '+JSON.stringify(Object.keys(specialActions)));
    return Object.assign(createDbActions(name),specialActions);
}
var EXPORT = {
    register:register,
    create:create
};
module.exports = EXPORT;