require('es6-promise').polyfill();
var mongoose = require('mongoose');
var configureGridFS = require('./db.gridfs').configure;
var configureGridFSActions = require('./db.gridfs').configureActions;

var Schema = mongoose.Schema;

var LOCAL = process.env.LOCAL && process.env.LOCAL.toString() == '1' || false;

// Build the connection string 
var dbURI = 'mongodb://root:root@ds059165.mongolab.com:59165/inspectors'; 

if(LOCAL){
    dbURI = 'mongodb://localhost:27017/scotchbox'; 
}

// Create the database connection 
mongoose.connect(dbURI); 

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', function () {  
  console.log('Mongoose default connection open to ' + dbURI);
}); 

// If the connection throws an error
mongoose.connection.on('error',function (err) {  
  console.log('Mongoose default connection error: ' + err);
}); 

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {  
  console.log('Mongoose default connection disconnected'); 
});

// If the Node process ends, close the Mongoose connection 
process.on('SIGINT', function() {  
  mongoose.connection.close(function () { 
    console.log('Mongoose default connection disconnected through app termination'); 
    process.exit(0); 
  }); 
}); 

configureGridFS(mongoose);


mongoose.model('Payment',{});
mongoose.model('Stats',{});
mongoose.model('File',{});
mongoose.model('Email',{});

mongoose.model('Log',{
    type:{type:String,default:'Error'}, //Info, Warning, Error.
    message:{type:String},
    created:{type:Date,default: new Date()}
});

mongoose.model('UserNotifications',{
    _user:{ type: Schema.Types.ObjectId, ref: 'User' ,required:true},
    disabledTypes:{type:[],default:[]}, //ex: ['newAccount'] //disable emailing notifications for new accounts.
    notifications:{type:[{ type: Schema.Types.ObjectId, ref: 'Notification' }],default:[]}
})
mongoose.model('Notification',{
    _config:{ type: Schema.Types.ObjectId, ref: 'UserNotifications' ,required:true},
    _user:{ type: Schema.Types.ObjectId, ref: 'User' ,required:true},
    type:{type:String,required:true},
    to:{type:String,required:true},
    subject:{type:String,required:true},
    contents:{type:String,required:true},
    sended:{type:Boolean,default:false},
    sendedDate:{type:Date},
    created:{type:Date,default: new Date()}
});//After 30 days, all the notifications are destroyed.

mongoose.model('Balance',{
    _user:{ type: Schema.Types.ObjectId, ref: 'User' ,required:true},
    amount:{type:String,required:true},
    items:[{ type: Schema.Types.ObjectId, ref: 'BalanceItem' }], 
});
mongoose.model('BalanceItem',{
    _user:{ type: Schema.Types.ObjectId, ref: 'User' ,required:true},
    _order:{ type: Schema.Types.ObjectId, ref: 'Order' ,required:true},
    description:{type:String,required:true},
    pending:{type:Boolean,required:true},
    amount:{type:String,required:true}
});

mongoose.model('TimeRange',{
    _user:{ type: Schema.Types.ObjectId, ref: 'User' ,required:true},
    description: {type:String,required:false},
    type:{type:String,required:true, default:'work-exception'},
    start:{type:Date,required:true},
    end:{type:Date,required:true},
    repeat: {type:String,required:true} //day, week, none
});

///SCHEMAS
mongoose.model('User', { 
    email: String,
    userType: {type:String, default: 'admin'}, //admin client diag
    password: String,
    firstName:String,
    lastName:String,
    passwordSended:{type:Boolean,default:false},
    
    fixedTel: String,
    cellPhone: String,


    //DIAG / CLIENT
    _orders:[{ type: Schema.Types.ObjectId, ref: 'Order' }], 

    //google address
    address:String, 
    city:String,
    department:String,
    region:String,
    country:String,
    postCode:String,

    stripeCustomer:{type:String,default:null},

    //DIAG
    priority:{type:Number},
    //diagWebsiteComission:{type:Number,default:0},
    diplomes:[{ type: Schema.Types.ObjectId, ref: 'fs.files' }],
    diplomesInfo:{type:{}}, //expiration date, obtention date, file info, etc.
    commission:Number,
    disabled:{type:Boolean,default:false},


    //CLIENT
    clientType: {type:String}, //(landlord / agency / Foncière)
    companyName: {type:String},
    siret: String,
    discount: {type:Number,default:0},
    
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now}
});


mongoose.model('Order', { 
    _diag:{ type: Schema.Types.ObjectId, ref: 'User' },
    _client:{ type: Schema.Types.ObjectId, ref: 'User' },
    diags: {type: {}, required:true},
    address:{type:String,required:true}, 
    info: {type:{},required:false},
    obs: String,
    notifications:Array,
    diagStart: {type:Date,required:true},
    diagEnd: {type:Date,required:true},
    status: {type:String,default:'created'},
    price: {type:Number,required:true,default:0},
//    time: String, //estimated time.
    fastDiagComm: {type:Number,default:0}, //
    pdfId: String,

    /*client details of an agency*/
    landLordFullName:{type:String},
    landLordEmail:{type:String},
    landLordPhone:{type:String},
    landLordAddress:{type:String},
    landLordPaymentEmailSended: {type:Boolean,default:false},

    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now},

    //keysWhere:{type:String},
    keysAddress:{type:String},
    keysTime:{type:Date},

    _charge:{type:String} //stripe charge associated
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



























