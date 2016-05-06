var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var def = {
    _parent: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: false
    },
    code: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    }
};
exports.configure = function(model) {
    model('Category',def);
}