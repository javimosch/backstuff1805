var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        code: {
            type: String,
            required:true,
            unique:true
        }, 
        description: {
            type: String
        },
        config: {
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
    }
};