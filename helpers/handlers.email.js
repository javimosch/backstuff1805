//var Order = mongoose.model('Order');
//var User = mongoose.model('User');
var Order = require('./handler.actions').create('Order');
var User = require('./handler.actions').create('Order');
var getFile = require('./utils').getFile;
var sendEmail = require('./utils.mailing').sendEmail;
var S = require('string');
var btoa = require('btoa')


function replace(html,params){
	html = S(html);
	for(var x in params){
		//console.log('EMAIL:REPLACE:'+x+':'+params[x]);
		html = html.replaceAll(x,params[x]);
	}
	return html.s;
}
function template(n,replaceParams){
	var html = getFile('../templates/'+n+'.html');
	if(replaceParams){
		html = replace(html,replaceParams);
		//console.log('EMAIL:REPLACE:',html);
	}
	return html;
}

function dummy(cb){
	cb({
		ok:true,message:'Mailing disabled'
	});
}



function clientNewAccount(_user, cb) {
	if(process.env.disableMailing==false || false) return dummy(cb);
	//
    var html = template('email',{
    	'$PASSWORD':_user.password || '[Contact support for the password]',
    	'$URL':process.env.adminURL || 'http://localhost:3000/admin?email='+_user.email+'&k='+btoa(_user.password)
    });
    var data = {
        html: html,
        from: process.env.emailFrom || 'admin@diags.com',
        to: _user.email || process.env.emailTo || 'arancibiajav@gmail.com',
        subject: 'Diag Project | New Account Details'
    };
    //cb(null,data);
    sendEmail(data, (err,r) => {
        cb(err,r);
    });
}

exports.actions = {
	clientNewAccount:clientNewAccount
};
