var SETTINGS = (function() {
	var private = {
		'GCM_ID': 'AIzaSyDw9JfL6zhyNi3sLncJdoLTzl0d61tPfGY',	
		'GCM_MSGCNT': '1',
		'GCM_RETRIES': 4,
		'GCM_TIMETOLIVE': 3000,	
		'GCM_DELAYWHILEIDLE' : false,
		'APN_GATEWAY': 'gateway.sandbox.push.apple.com',
		'APN_EXPIRY' : 3600, 
		'APN_SOUND': 'ping.aiff',
		"ADM_CLIENT_ID": 'SET-YOUR-ADM-CLIENT-ID',
		"ADM_CLIENT_SECRET": 'SET-YOUR-ADM-CLIENT-SECRET',
		"ADM_EXPIRES_AFTER": 86400,
		"PARARELL_TIMEOUT" : 30000,
		"PUSH_TITLE" : 'MY_TITLE',
		"PUSH_MESSAGE" : 'MY_MESSAGE',

	};
	return {
		get: function(name) { return private[name]; }
    };
})();

module.exports.get = SETTINGS.get;
