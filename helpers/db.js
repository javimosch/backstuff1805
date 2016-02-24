require('es6-promise').polyfill();
var mongoose = require('mongoose');
var configureGridFS = require('./db.gridfs').configure;

var Schema = mongoose.Schema;

// Build the connection string 
var dbURI = 'mongodb://root:root@ds059165.mongolab.com:59165/inspectors'; 

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
    address:String, 
    tel: String,

    //DIAG / CLIENT
    _orders:[{ type: Schema.Types.ObjectId, ref: 'Order' }], 

    city:String,
    country:String,
    zipCode:String,

    stripeCustomer:{type:String,default:null},

    //DIAG
    diagPriority:{type:Number},
    //diagWebsiteComission:{type:Number,default:0},
    postCode:String,
    department:String,
    region:String,
    city:String,
    diplomes:[],
    comission:Number,
    disabled:{type:Boolean,default:false},


    //CLIENT
    clientType: {type:String}, //(landlord / agency / Foncière)
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
    status: {type:String,default:'ordered'},
    price: {type:Number,required:true,default:0},
//    time: String, //estimated time.
    fastDiagComm: {type:Number,default:0}, //
    pdfId: String,
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now},

    _charge:{type:String} //stripe charge associated
});

/*
        status:
            - ordered //just created 
            - prepaid //client paid first. When upload pdf -> complete
            - delivered // PDF uploaded first. When client paid -> complete
            - completed
        */


exports.mongoose = mongoose;



























