var mailgun = require('mailgun-js')({
	apiKey: 'key-4b58a66565bdaeceeaa5c3a0b29f64f8',
	domain: 'sandbox6495084a9e554582a14b91bf2b45baa0.mailgun.org'
});
var getFile = require('./utils').getFile;
var mailcomposer = require('mailcomposer');

exports.mailgun = mailgun;
exports.mailgunHTML = mailgunHTML;

exports.sendEmail = function(data,cb){
	return mailgunHTML(data,cb);
};

function mailgunHTML(options, cb) {
	if(!options.html && options.templateUrl){
		options.html = getFile(options.html);
	}
	var mail = mailcomposer({
		from: options.from,
		to: options.to,
		subject: options.subject,
		body: options.body,
		html: options.html
	});
	mail.build(function(mailBuildError, message) {
		if (mailBuildError) {
			return cb(null,{
				error: mailBuildError,
				ok: false
			});
		}
		var dataToSend = {
			to: options.to,
			message: message.toString('ascii')
		};
		mailgun.messages().sendMime(dataToSend, function(sendError, body) {
			cb(null,{
				message: (sendError)?"Error":"Success",
				result: body,
				err: sendError,
				ok: !sendError
			});
		});
	});
}