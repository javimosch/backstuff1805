require('es6-promise').polyfill();
var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var configureGridFS = require('../controllers/ctrl.file').configure;
var configureGridFSActions = require('../controllers/ctrl.file').configureActions;
var Schema = mongoose.Schema;
var LOCAL = process.env.LOCAL && process.env.LOCAL.toString() == '1' || false;

// Build the connection string 
var dbURI = 'mongodb://root:root@ds011452.mlab.com:11452/manitas';

if (LOCAL) {
    dbURI = 'mongodb://localhost:27017/scotchbox';
}

if (process.env.dbURI) {
    dbURI = process.env.dbURI || dbURI;
}

// Create the database connection 
mongoose.connect(dbURI);

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', function() {
    console.log('Mongoose default connection open to ' + dbURI);
});

// If the connection throws an error
mongoose.connection.on('error', function(err) {
    console.log('Mongoose default connection error: ' + err);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', function() {
    console.log('Mongoose default connection disconnected');
});

// If the Node process ends, close the Mongoose connection 
process.on('SIGINT', function() {
    mongoose.connection.close(function() {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});

configureGridFS(mongoose);





var models = {};
var schemas = {};

exports.getModel = (n) => models[n];
exports.getSchema = (n) => schemas[n];
exports.mongoose = mongoose;

function model(n, def) {
    if (!def) console.log('WARN:' + n + ' def required');
    if (!def.createdAt) {
        def.createdAt = {
            type: Date,
            default: Date.now
        };

    }
    if (!def.updatedAt) {
        def.updatedAt = {
            type: Date,
            default: Date.now
        }
    }
    var schema = new mongoose.Schema(def);
    schema.plugin(mongoosePaginate);
    schema.pre('save', function(next) {
        var now = new Date();
        this.updatedAt = now;
        if (!this.createdAt) {
            this.createdAt = now;
        }
        next();
    });
    models[n] = mongoose.model(n, schema);
    schemas[n] = schema;
}

var create = model;
create('Payment', require('../schemas/schema.diags-payment').def);
create('Role', require('../schemas/schema.role').def);
create('Push', require('../schemas/schema.push').def);
create('Device', require('../schemas/schema.device').def);
create('Pdf', require('../schemas/schema.pdf').def);
create('Category', require('../schemas/schema.category').def);
create('Text', require('../schemas/schema.text').def);
create('Notification', require('../schemas/schema.notification').def);
create('Email', {});
create('Log', require('../schemas/schema.log').def);
create('Stripe', {});
create('Settings', require('../schemas/schema.diags-settings').def);
create('Configuration', require('../schemas/schema.configuration').def);

try {
    require('../config/config.' + process.env.APPNAME.toString().toLowerCase()).models(create);
}
catch (e) {
    console.log('ERROR', 'Loading config models fail for project', process.env.APPNAME);
    console.log(JSON.stringify(e));
}

configureGridFSActions();