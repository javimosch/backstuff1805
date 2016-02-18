var mongoose = require('./db').mongoose;
var moment = require('moment');
var promise = require('./utils').promise;
var _ = require('lodash');
var generatePassword = require("password-maker");
var validate = require('./validator').validate;
var handleMissingKeys = require('./validator').handleMissingKeys;
//var ClientActions = require('./handlers.client').actions;
var User = mongoose.model('User');
var Order = mongoose.model('Order');
var actions = require('./handler.actions').create('Order');
var UserAction = require('./handlers.user').actions;


var email = require('./handlers.email').actions;

var saveKeys = ['_client', '_diag', 'diagStart', 'diagEnd', 'diags'

    , 'address', 'price' //, 'time'
];

function create(data, cb) {
    actions.create(data, cb, saveKeys);
}

function save(data, cb) {
    actions.log('save=' + JSON.stringify(data));
    actions.createUpdate(data, (err, r) => {
        if (err) return cb(err, null);
        cb(err, r);
    }, {}, saveKeys).on('created', (err, _order) => {
        
        UserAction.get({_id:_order._client._id || _order._client},(err,_client)=>{
            email.newOrder(_client,_order,null); 
        });
        UserAction.get({_id:_order._diag._id || _order._diag},(err,_diag)=>{
            email.newOrder(_diag,_order,null); 
        });
        UserAction.getAll({userType:'admin'},(err,_admins)=>{
            _admins.forEach((_admin)=>{
                email.newOrder(_admin,_order,null);     
            })
        });

    });
}

function saveWithEmail(data, cb) {
    actions.log('saveWithEmail=' + JSON.stringify(data));
    actions.check(data, ['email', '_diag', 'diagStart', 'diagEnd'

        , 'diags', 'address', 'price', 'time'
    ], (err, r) => {
        if (err) return cb(err, null);
        UserAction.get({
            email: data.email,
            type: 'client'
        }, (err, r) => {
            if (err) return cb(err, null);
            actions.log('saveWithEmail=user:get:return' + JSON.stringify(r));
            if (r) {
                data._client = r._id;
                return save(data, cb);
            } else {
                UserAction.createClientIfNew({
                    email: data.email
                }, (err, r) => {
                    if (err) return cb(err, null);
                    data._client = r._id;
                    return save(data, cb);
                });
            }
        });
    });
}

function saveTest(data, cb) {
    var data = {
        "diags": {
            "dpe": true,
            "dta": false,
            "crep": false,
            "loiCarrez": true,
            "ernt": true,
            "termites": false,
            "gaz": false,
            "electricity": false,
            "parasitaire": false
        },
        "sell": true,
        "house": true,
        "squareMeters": "-40m2",
        "constructionPermissionDate": "avant le 01/01/1949",
        "address": "15 Boulevard Voltaire, 75011 Paris, Francia",
        "gasInstallation": "Oui, Moins de 15 ans",
        "date": "2016-02-12T11:20:15.229Z",
        "price": 70,
        "time": "1:5",
        "diagStart": 1455274214714,
        "_diag": '56bdcb44f0aba6ab106a7007',
        "diagEnd": 1455277814714,
        "email": "arancibiajav@gmail.com"
    };
    return saveWithEmail(data, cb);
}

exports.actions = {
    //custom
    save: save,
    saveWithEmail: saveWithEmail,
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
    app.post('/order/email', (req, res) => email.clientNewAccount(req.body, actions.result(res)));
    app.post('/order/existsById', (req, res) => actions.existsById(req.body, actions.result(res)));
    app.post('/order/existsByField', (req, res) => actions.existsByField(req.body, actions.result(res)));
    app.post('/order/createUpdate', (req, res) => actions.createUpdate(req.body, actions.result(res)));
    app.post('/order/create', (req, res) => create(req.body, actions.result(res)));
    app.post('/order/find', (req, res) => actions.find(req.body, actions.result(res)));
    app.post('/order/login', (req, res) => login(req.body, actions.result(res)));
    app.post('/order/save', (req, res) => save(req.body, actions.result(res)));
    app.post('/order/saveTest', (req, res) => saveTest(req.body, actions.result(res)));
    app.post('/order/saveWithEmail', (req, res) => saveWithEmail(req.body, actions.result(res)));
    app.post('/order/get', (req, res) => actions.get(req.body, actions.result(res)));
    app.post('/order/getAll', (req, res) => actions.getAll(req.body, actions.result(res)));
    app.post('/order/remove', (req, res) => actions.remove(req.body, actions.result(res)));
    app.post('/order/removeAll', (req, res) => actions.removeAll(req.body, actions.result(res)));
    actions.log('routes-order-ok');
}
