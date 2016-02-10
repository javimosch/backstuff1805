var mongoose = require('mongoose');

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


///SCHEMAS
mongoose.model('Cat', { name: String });

mongoose.model('Diagnostiqueur', { 
    firstName: String,
    lastName: String 
});

mongoose.model('Client', { 
    type: {type:String,default:'Landlord'}, //(Landlord / Agency / Foncière)
    address: String,
    tel: String,
    siret: String,
    discount: {type:Number,default:0},
    email: String,
    password: String,
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now},
    passwordSended:{type:Boolean,default:false},
});
/*
Type (Landlord / Agency / Foncière)
Adress
Tel
Siret (not needed if landlord)
Discount (admin decide it)
Mail (unique)
password
*/

mongoose.model('Order', { 
    inspectorId: String,
    clientId: String,
    diags: Array,
    address:String, //may differ from client address
    info: Array,
    obs: String,
    date: Date, //date of diag (combine date and time choiced)
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now},
    status: String,
    price: Number,
    time: String, //estimated time.
    commision: {type:Number,default:0}, //
    pdfId: String
});
/*
Commande
ID
ID client
Liste de diags
Landlord Adress
Landlord Phonenumber
Diag adress
Informations
Observation
Date de commande
date du diag
Heure début diag
Heure fin diag
ID Diagnostiqueur
Statut (commandé/livré)
Total Price
Total Diag
FastDiag Comm
PDF Diag

*/



exports.mongoose = mongoose;



























