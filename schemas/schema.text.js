var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var def = {
    _category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: false
    },
    code: {
        type: String,
        required: true
    }, //EX: BOOKING_DPE_TITLE_2_CONTENT
    description: {
        type: String,
        required: false
    },
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
};
exports.configure = function(model) {
    model('Text',def);
}