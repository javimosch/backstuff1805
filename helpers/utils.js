function MyPromise(cb) {
    var _scope = {
        cb: null,
        errorCb: null,
        errorRes: null,
        res: null
    }
    var resolve = function(res) {
        _scope.cb && _scope.cb(res);
        _scope.res = res;
    };
    var error = function(errorRes) {
        _scope.errorCb && _scope.errorCb(errorRes);
        _scope.errorRes = errorRes;
    }
    cb(resolve, error);
    rta = {
        then: function(cb) {
            if (_scope.res) cb(_scope.res)
            else _scope.cb = cb;
            return rta;
        },
        error: function(errorCb) {
            if (_scope.errorRes) errorCb(_scope.errorRes)
            else _scope.errorCb = errorCb;
            return rta;
        }
    };
    return rta;
}

exports.promise = MyPromise;