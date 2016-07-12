var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        registrationId: {
            type: String,
            index: true,
            unique: true
        }
    }
};