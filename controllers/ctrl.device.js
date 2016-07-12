var ctrl = require('../model/db.controller').create;
module.exports = {
    register: register
};

function register(data, cb) {
    console.log('debug device register', JSON.stringify(data));
    if (!data.registrationId) {
        return cb("registrationId required");
    }
    var Device = ctrl('Device');
    Device.save({
        registrationId: data.registrationId,
        __match: {
            registrationId: data.registrationId,
        }
    }, (err, _d) => {
        cb(err, true);
        console.log('debug device registered?' + (!err) ? 'Yes!' : 'Nah');
    });
}