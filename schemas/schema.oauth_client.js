var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        name:String,
        keySecret:String,
        redirectUri: {
            type: String
        },
        grants:{
            type:[],
            default:[]
        }
    }
};