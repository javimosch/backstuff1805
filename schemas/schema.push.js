var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        _device: {
            type: Schema.Types.ObjectId,
            ref: 'Device',
            required: true,
            index: true
        }
    }
};