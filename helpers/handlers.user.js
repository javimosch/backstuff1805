var mongoose = require('./db').mongoose;
var generatePassword = require("password-maker");
var User = mongoose.model('User');
var promise = require('./utils').promise;
var validate = require('./validator').validate;
var handleMissingKeys = require('./validator').handleMissingKeys;
var actions = require('./handler.actions').create('User');
var email = require('./handlers.email').actions;

function save(data, cb) {
    actions.createUpdate(data, cb, {
        email: data.email
    }, ['userType', 'email']).on('created', (err, _user) => {
        var notify = null;
        switch (_user.userType) {
            case 'admin':
                notify = email.adminNewAccount;
                break;
            case 'diag':
                notify = email.diagNewAccount;
                break;
            case 'client':
                notify = email.clientNewAccount;
                break;
        }
        if (notify) {
            notify(_user, (err,r)=>email.handleSend(_user,err,r));
        }
    });
}

function create(data, cb) {
    actions.create(data, cb, ['email', 'userType', 'password']);
}

function createUser(data, cb) {
    actions.log('createUser=' + JSON.stringify(data));
    data.password = data.password || generatePassword(8);
    data.userType = data.userType || 'admin';
    create(data, cb);
}

function createDiag(data, cb) {
    actions.log('createDiag=' + JSON.stringify(data));
    data.userType = 'diag';
    createUser(data, (err, _user) => {
        if (err) return cb(err, null);
        email.diagNewAccount(_user, (err, r) => {
            //async (write log on error)
            if (r.ok) {
                actions.log(_user.email + ' new account email sended' + JSON.stringify(r));
                _user.passwordSended = true;
                _user.save((err, r) => {
                    if (!err) actions.log(_user.email + ' passwordSended=true');
                });
            } else {
                actions.log(_user.email + ' new account email sended failed');
                actions.log(JSON.stringify(err));
            }
        });
        return cb(err, _user);
    });
}

function createClient(data, cb) {
    actions.log('createClient=' + JSON.stringify(data));
    data.userType = 'client';
    data.clientType = data.clientType || 'LandLord';
    createUser(data, (err, _user) => {
        if (err) return cb(err, null);
        email.clientNewAccount(_user, (err, r) => {
            //async (write log on error)
            if (r.ok) {
                actions.log(_user.email + ' new account email sended' + JSON.stringify(r));
                _user.passwordSended = true;
                _user.save((err, r) => {
                    if (!err) actions.log(_user.email + ' passwordSended=true');
                });
            } else {
                actions.log(_user.email + ' new account email sended failed');
                actions.log(JSON.stringify(err));
            }
        });
        return cb(err, _user);
    });
}

function createClientIfNew(data, cb) {
    actions.log('createClientIfNew=' + JSON.stringify(data));
    actions.check(data, ['email'], (err, r) => {
        if (err) return cb(err, null);
        actions.get({ email: data.email }, (err, r) => {
            if (err) return cb(err, null);
            if (!r) {
                createClient(data, cb);
            } else {
                cb(null, r);
            }
        });
    });
}

function login(data, cb) {
    console.log('USER:login=' + JSON.stringify(data));
    User.findOne(actions.toRules({
        email: data.email,
        password: data.password
    })).exec(cb);
}


exports.actions = {
    //custom
    save: save,
    createClientIfNew: createClientIfNew,
    login: login,
    createDiag: createDiag,
    //heredado
    existsById: actions.existsById,
    existsByField: actions.existsByField,
    createUpdate: actions.createUpdate,
    getAll: actions.getAll,
    remove: actions.remove,
    result: actions.result,
    get: actions.get,
    check: actions.check,
    removeAll: actions.removeAll,
    toRules: actions.toRules,
    find: actions.find,
    create: create,
    log: actions.log
};

exports.routes = (app) => {
    app.post('/user/createClient', (req, res) => createClient(req.body, actions.result(res)));
    app.post('/user/existsById', (req, res) => actions.existsById(req.body, actions.result(res)));
    app.post('/user/existsByField', (req, res) => actions.existsByField(req.body, actions.result(res)));
    app.post('/user/createUpdate', (req, res) => actions.createUpdate(req.body, actions.result(res)));
    app.post('/user/create', (req, res) => create(req.body, actions.result(res)));
    app.post('/user/find', (req, res) => actions.find(req.body, actions.result(res)));
    app.post('/user/login', (req, res) => login(req.body, actions.result(res)));
    app.post('/user/save', (req, res) => save(req.body, actions.result(res)));
    app.post('/user/get', (req, res) => actions.get(req.body, actions.result(res)));
    app.post('/user/getAll', (req, res) => actions.getAll(req.body, actions.result(res)));
    app.post('/user/remove', (req, res) => actions.remove(req.body, actions.result(res)));
    app.post('/user/removeAll', (req, res) => actions.removeAll(req.body, actions.result(res)));
    actions.log('routes-user-ok');
}
