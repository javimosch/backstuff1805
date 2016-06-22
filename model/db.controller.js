var createDbActions = require('./db.actions').create;
var actions = {};

function register(name, path) {
    path = path || 'controllers/ctrl.' + name.toLowerCase();
    actions[name] = require(process.cwd() + '/' + path);
    console.log('db.controller ' + name + " register " + Object.keys(actions[name]).length + " actions.");
    //console.log('db.controller '+name+' register the following actions '+JSON.stringify(Object.keys(actions[name])));
    var obj = create(name);
    EXPORT['$' + name] = obj;

    if (obj._configure && !obj._configuredFlag) {
        obj._configuredFlag = true
        console.log(name.toUpperCase() + ": Configure");
        obj._configure(obj._hook);
    }
}

function create(name) {
    //if (EXPORT['$' + name]) return EXPORT['$' + name];
    //
    //var specialActions = actions[name] || {};
    
    var path = path || 'controllers/ctrl.' + name.toLowerCase();
    var specialActions = require(process.cwd() + '/' + path);
    
    //console.log('db.controller '+ name + ' special actions are '+JSON.stringify(Object.keys(specialActions)));
    return Object.assign(createDbActions(name), specialActions);
}
var EXPORT = {
    register: register,
    create: create
};
module.exports = EXPORT;