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


exports.mongoose = mongoose;



























