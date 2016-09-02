var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        description: {
            type: String,
            required: true,
            unique:true
        },
        done: {
            type: Boolean,
            default: false
        }
    }
};
