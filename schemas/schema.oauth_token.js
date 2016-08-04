var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        value: {
            type: String,
            required: true
        },
        clientId: {
            type: String,
            required: true
        },
        userId: {
            type: String,
            required: true
        },
        expires: {
            type: Date,
            default: Date.now() + 1000 * 60 * 60
        },
    }
};