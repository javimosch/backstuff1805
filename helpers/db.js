require('es6-promise').polyfill();
var mongoose = require('mongoose');

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
    _orders:[{ type: Schema.Types.ObjectId, ref: 'Order' }],

    //DIAG
    diagPriority:{type:Number},
    postCode:String,
    department:String,
    region:String,
    city:String,
    diplomes:[],
    comission:Number,

    //CLIENT
    clientType: {type:String}, //(Landlord / Agency / Foncière)
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
    info: Array,
    obs: String,
    diagStart: {type:Date,required:true},
    diagEnd: {type:Date,required:true},
    status: {type:String,default:'ordered'},
    price: {type:String,required:true,default:0},
//    time: String, //estimated time.
    fastDiagComm: {type:Number,default:0}, //
    pdfId: String,
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now}
});

/*
        status:
            - ordered //just created 
            - prepaid //client paid first. When upload pdf -> complete
            - delivered // PDF uploaded first. When client paid -> complete
            - completed
        */


exports.mongoose = mongoose;



























