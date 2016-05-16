require('es6-promise').polyfill();
var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var configureGridFS = require('../controllers/ctrl.file').configure;
var configureGridFSActions = require('../controllers/ctrl.file').configureActions;
var Schema = mongoose.Schema;
var LOCAL = process.env.LOCAL && process.env.LOCAL.toString() == '1' || false;
var models = {};
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


model('Payment', {
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});
model('Stats', {
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});
model('File', {
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});
model('Email', {
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

model('Settings', {
    pricePercentageIncrease: {},
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

require('../schemas/schema.category').configure(model);
require('../schemas/schema.text').configure(model);

model('Pdf',require('../schemas/schema.pdf').def);

model('Log', {
    type: {
        type: String,
        default: 'error'
    }, //Info, Warning, Error.
    message: {
        type: String
    },
    data: {
        type: {},
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

model('UserNotifications', {
    _user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    disabledTypes: {
        type: [],
        default: []
    }, //ex: ['newAccount'] //disable emailing notifications for new accounts.
    notifications: {
        type: [{
            type: Schema.Types.ObjectId,
            ref: 'Notification'
        }],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
})
model('Notification', {
    _config: {
        type: Schema.Types.ObjectId,
        ref: 'UserNotifications',
        required: true
    },
    _user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    contents: {
        type: String,
        required: true
    },
    sended: {
        type: Boolean,
        default: false
    },
    sendedDate: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}); //After 30 days, all the notifications are destroyed.

model('Balance', {
    _user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: String,
        required: true
    },
    items: [{
        type: Schema.Types.ObjectId,
        ref: 'BalanceItem'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});
model('BalanceItem', {
    _user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    _order: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    description: {
        type: String,
        required: true
    },
    pending: {
        type: Boolean,
        required: true
    },
    amount: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

model('TimeRange', {
    _user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    description: {
        type: String,
        required: false
    },
    type: {
        type: String,
        required: true,
        default: 'work-exception'
    },
    start: {
        type: Date,
        required: true
    },
    end: {
        type: Date,
        required: true
    },
    repeat: {
        type: String,
        required: true
    }, //day, week, none
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

///SCHEMAS
model('User', {
    email: String,
    userType: {
        type: String,
        default: 'admin'
    }, //admin client diag
    password: String,
    firstName: String,
    lastName: String,
    passwordSended: {
        type: Boolean,
        default: false
    },

    fixedTel: String,
    cellPhone: String,


    //DIAG / CLIENT
    _orders: [{
        type: Schema.Types.ObjectId,
        ref: 'Order'
    }],

    //google address
    address: String,
    city: String,
    department: String,
    region: String,
    country: String,
    postCode: String,

    stripeCustomer: {
        type: String,
        default: null
    },

    //DIAG
    priority: {
        type: Number
    },
    //diagWebsiteComission:{type:Number,default:0},
    diplomes: [{
        type: Schema.Types.ObjectId,
        ref: 'fs.files'
    }],
    diplomesInfo: {
        type: {}
    }, //expiration date, obtention date, file info, etc.
    commission: Number,
    disabled: {
        type: Boolean,
        default: false
    },
    notifications: {
        type: {},
        default: {}
    },


    //CLIENT
    clientType: {
        type: String
    }, //(landlord / agency / Foncière)
    companyName: {
        type: String
    },
    siret: String,
    discount: {
        type: Number,
        default: 0
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});



function model(n, def) {

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
}
exports.getModel = (n) => models[n];


model('Order', {
    _diag: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    _client: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    diags: {
        type: {},
        required: true
    },
    address: {
        type: String,
        required: true
    },
    info: {
        type: {},
        required: false
    },
    obs: String,
    notifications: {
        type: {},
        default: {}
    },
    start: {
        type: Date,
        required: true
    },
    end: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        default: 'created'
    },
    price: {
        type: Number,
        required: true,
        default: 0
    },
    priceHT: {
        type: Number,
        required: true,
        default: 0
    },
    diagRemunerationHT: {
        type: Number,
        required: true,
        default: 0
    },
    revenueHT: {
        type: Number,
        required: true,
        default: 0
    },
    vatRate: {
        type: Number,
        required: true,
        default: 0
    },
    //    time: String, //estimated time.
    fastDiagComm: {
        type: Number,
        default: 0
    }, //
    pdfId: String,

    /*client details of an agency*/
    landLordFullName: {
        type: String
    },
    landLordEmail: {
        type: String
    },
    landLordPhone: {
        type: String
    },
    landLordAddress: {
        type: String
    },
    landLordPaymentEmailSended: {
        type: Boolean,
        default: false
    },

    paidAt:{
      type:Date,
      default:null //date were the order was paid
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },

    //keysWhere:{type:String},
    keysAddress: {
        type: String
    },
    keysTimeFrom: {
        type: Date
    },
    keysTimeTo: {
        type: Date
    },

    _charge: {
        type: String
    } //stripe charge associated
});

/*
        status:
            - created //just created
            - ordered //client (agency/other) clicks invoice end of the mont
            - prepaid //client paid first. When upload pdf -> complete
            - delivered // PDF uploaded first. When client paid -> complete
            - completed
        */


exports.mongoose = mongoose;

configureGridFSActions();
