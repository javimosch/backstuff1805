//var Order = mongoose.model('Order');
//var User = mongoose.model('User');
var Order = require('./handler.actions').create('Order');
var User = require('./handler.actions').create('Order');
var getFile = require('./utils').getFile;
var sendEmail = require('./utils.mailing').sendEmail;
var moment = require('moment');
var S = require('string');
var btoa = require('btoa')

var modelName = 'email';
var actions = {
    log: (m) => {
        console.log(modelName.toUpperCase() + ': ' + m);
    }
};


function adminUrl(join) {
    var url = process.env.adminURL || 'http://localhost:3000/admin#' + join;
    url = url.replace('//', '/');
    return url;
}

function replace(html, params) {
    html = S(html);
    for (var x in params) {
        //console.log('EMAIL:REPLACE:'+x+':'+params[x]);
        html = html.replaceAll(x, params[x]);
    }
    return html.s;
}

function template(n, replaceParams) {
    var html = getFile('../templates/' + n + '.html');
    if (replaceParams) {
        html = replace(html, replaceParams);
        //console.log('EMAIL:REPLACE:',html);
    }
    return html;
}

function dummy(cb) {
    cb(null,{
        ok: true,
        message: 'Mailing disabled'
    });
}

function send(opt) {
    if (process.env.disableMailing === '1') return dummy(opt.cb);
    var html = template(opt.templateName, opt.templateReplace);
    var data = {
        html: html,
        from: process.env.emailFrom || 'admin@diags.com',
        to: opt.to || process.env.emailTo || 'arancibiajav@gmail.com',
        subject: 'Diag Project | ' + opt.subject
    };
    sendEmail(data, (err, r) => {
        if (opt.cb) {
            opt.cb(err, r);
        } else {
            //LOG
        }
    });
}

function time(d) {
    return moment(d).format('HH:mm');
}

function newOrder(_user, _order, cb) {
    actions.log('newOrder=' + JSON.stringify(_user));
    send({
        to: _user.email,
        subject: "New Order",
        templateName: 'new.order.created',
        templateReplace: {
            '$NAME': _user.firstName || _user.email,
            '$ORDER_URL': adminUrl('/orders/edit/' + _order._id),
            '$ORDER_DESCR': _order.address + ' (' + time(_order.diagStart) + ' - ' + time(_order.diagEnd) + ')',
            '$PASSWORD': _user.password || '[Contact support for the password]',
            '$URL': adminUrl('?email=' + _user.email + '&k=' + btoa(_user.password))
        },
        cb: cb
    });
}


function diagNewAccount(_user, cb) {
    actions.log('diagNewAccount=' + JSON.stringify(_user));
    send({
        to: _user.email,
        subject: "New Diag Account",
        templateName: 'diag.new.account',
        templateReplace: {
            '$NAME': _user.firstName || _user.email,
            '$PASSWORD': _user.password || '[Contact support for the password]',
            '$URL': process.env.adminURL || 'http://localhost:3000/admin?email=' + _user.email + '&k=' + btoa(_user.password)
        },
        cb: cb
    });
}

function adminNewAccount(_user, cb) {
    actions.log('adminNewAccount=' + JSON.stringify(_user));
    send({
        to: _user.email,
        subject: "Your Admin Account is ready",
        templateName: 'admin.new.account',
        templateReplace: {
            '$NAME': _user.firstName || _user.email,
            '$PASSWORD': _user.password || '[Contact support for the password]',
            '$URL': process.env.adminURL || 'http://localhost:3000/admin?email=' + _user.email + '&k=' + btoa(_user.password)
        },
        cb: cb
    });
}

function clientNewAccount(_user, cb) {
    actions.log('clientNewAccount=' + JSON.stringify(_user));
    send({
        to: _user.email,
        subject: "New Client Account",
        templateName: 'client.new.account',
        templateReplace: {
            '$NAME': _user.firstName || _user.email,
            '$PASSWORD': _user.password || '[Contact support for the password]',
            '$URL': process.env.adminURL || 'http://localhost:3000/admin?email=' + _user.email + '&k=' + btoa(_user.password)
        },
        cb: cb
    });
}

function handleNewAccount(_user, err, r) {
    //async (write log on error)
    if (r.ok) {
        actions.log(_user.email + ' new account email sended' + JSON.stringify(r));
        _user.passwordSended = true;
        _user.save((err, r) => {
            if (!err) actions.log(_user.email + ' passwordSended=true');
        });
    } else {
        actions.log(_user.email + ' new account email sended failed');
        actions.log(JSON.stringify(err));
    }
}

exports.actions = {
    clientNewAccount: clientNewAccount,
    diagNewAccount: diagNewAccount,
    adminNewAccount: adminNewAccount,
    handleNewAccount: handleNewAccount,
    newOrder:newOrder
};
