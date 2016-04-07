var mongoose = require('../helpers/db').mongoose;
var generatePassword = require("password-maker");
var promise = require('../helpers/utils').promise;
var validate = require('../helpers/validator').validate;
var handleMissingKeys = require('../helpers/validator').handleMissingKeys;
var User = require('../helpers/handler.actions').create('User');
var Order = require('../helpers/handler.actions').create('Order');
var Balance = require('../helpers/handler.actions').create('Balance');
var BalanceItem = require('../helpers/handler.actions').create('BalanceItem');
var email = require('../helpers/handlers.email').actions;
var _ = require('lodash');
var moment = require('moment');

var assert = require('assert');
describe('String#split', function() {
    it('should return an array', function() {
        assert(Array.isArray('a,b,c'.split(',')));
    });
})


var assert = require('assert');
describe('User # create & delete', function() {
	 this.timeout(10000);
    it('should save success', function(done) {

        User.create({
            email: 'test@test.com',
            disabled: true
        }, (err, r) => {
            if (err) throw err;
            User.remove({
            	_id:r._id
            }, cb => {
                if (err) throw err;
                done();
            });
        });
        //assert(Array.isArray('Not an array!'));
    });
})