var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        from: String,
        to: String,
        type: String,
        when: {
            type: Date,
            required: true
        },
        obs: String,
        //created   not assigned
        //assigned  has a biker assigned
        //working   is on the way
        //delivered is completed but not paid
        //completed is paid and delivered
        //canceled  was canceled by the owner
        isPaid: Boolean,
        status: {
            type: String,
            default: 'created',
            required: true
        },
        //Bikers who apply to work
        bikersAvailable: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
        //Assigned biker
        _biker: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        debriefing: {
            type: {}
        },
        info: {
            type: {}
        },
        _owner: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        priceTTC: {
            type: Number,
            required: false
        },
        priceHT: {
            type: Number,
            required: false
        },
        bikerRevenueHT: {
            type: Number,
            required: false
        },
        revenueHT: {
            type: Number,
            required: false
        },
        commissionPorc: {
            type: Number
        },
        commissionPrice: {
            type: Number
        },
        vatRate: {
            type: Number,
            required: true,
            default: 0
        },
        vatPrice: {
            type: Number,
            required: true,
            default: 0
        },
        google: {
            //distance
            //duration
            //etc
            type: {},
            default: {}
        },
        notifications: {
            type: {},
            default: {}
        },
        paidAt: {
            type: Date,
            default: null //date were the order was paid
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
