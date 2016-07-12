var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        email: {
            type: String,
            unique: true
        },
        pwd: String,
        fullName: String,
        nickName: String,
        nie: String, //id number / passaport
        phone: String,
        extra: {
            type: {},
            default: {}
        },
        stats: {
            type: {},
            default: {}
        },
        notifications: {
            type: {},
            default: {}
        },
        eurxkmbase: {
            type:Number,
            default:0
        },
        eurxkm: {
            type:Number,
            default:1
        },
        roles: [{
            type: Schema.Types.ObjectId,
            ref: 'Role'
        }],
        stripeSecret: {
            type: String,
            unique: false
        },
        stripePublic: {
            type: String,
            unique: false
        },
        //biker address
        address: String,
        city: String,
        department: String,
        region: String,
        country: String,
        postCode: String,
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        },
        loggedAt:{
            type:Date
        }
    }
};
