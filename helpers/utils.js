var fs = require("fs"),
    json;

var moment = require('moment');

exports.formatTime = (d)=>{
    return moment(d).format('HH:mm');
};

function readFileSync(file, encoding, json) {
    var filepath = __dirname + '/' + file;
    if (typeof(encoding) == 'undefined') {
        encoding = 'utf8';
    }
    var x = fs.readFileSync(filepath, encoding);
    return (json)?JSON.parse(x):x;
}
exports.getJSON = (file) => readFileSync(file,undefined, true);
exports.getFile = (file) => readFileSync(file,undefined, false);


//routing
function adminUrl(join) {
    console.log('Using adminURL VAR: '+ process.env.adminURL);
    var path = process.env.adminURL || 'http://localhost:3000/admin#';
    if(!process.env.adminURL){
        console.log('process.env.adminURL not found. Using '+path);
    }
    var url = path + join;
    url = url.replace('//', '/');
    url = url.replace(':/','://');
    return url;
}
exports.adminUrl = adminUrl;


function MyPromise(cb) {
    var _scope = {
        cb: null,
        errorCb: null,
        errorRes: null,
        res: null,
        evt:{}
    };
    var resolve = function(res) {
        if (_scope.cb) {
            _scope.cb(res);
        }
        _scope.res = res || {};
    };
    var error = function(errorRes) {
        if (_scope.errorCb) {
            _scope.errorCb(errorRes);
        }
        _scope.errorRes = errorRes || {};
    };
    var emit = function(n,err,r){
        _scope.evt[n] = _scope.evt[n] || {};
        _scope.evt[n].res = {err:err,r:r};
        if(_scope.evt[n].cb!==undefined){
            _scope.evt[n].cb(_scope.evt[n].res.err,_scope.evt[n].res.r);
        }
    };
    cb(resolve, error,emit);
    var rta = {
        then: function(cb) {
            if (_scope.res) cb(_scope.res);
            else _scope.cb = cb;
            return rta;
        },
        error: function(errorCb) {
            if (_scope.errorRes) errorCb(_scope.errorRes);
            else _scope.errorCb = errorCb;
            return rta;
        },
        on:function(n,cb){
            _scope.evt[n] = _scope.evt[n]  || {};
            _scope.evt[n].cb = cb;
            if(_scope.evt[n].res !== undefined){
                _scope.evt[n].cb(_scope.evt[n].res.err,_scope.evt[n].res.r);
            }
            return rta;
        }
    };
    return rta;
}

exports.promise = MyPromise;
