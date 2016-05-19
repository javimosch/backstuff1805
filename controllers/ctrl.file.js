var Grid = require('gridfs-stream');
var fs = require('fs');
var path = require("path");
var generatePassword = require("password-maker");
var inspect = require('util').inspect;
var modelName = 'file';
var conn, gfs, mongoose, actions; //Schema
var configure = (m) => {
    mongoose = m;
    Grid.mongo = mongoose.mongo;
    conn = mongoose.connection;
   // Schema = mongoose.Schema;
    gfs = Grid(conn.db);
};
var configureActions = () => {
    actions = require('../model/db.actions').create('File', mongoose);
};

module.exports = {
    configureActions:configureActions,
    configure:configure,
    exists: exists,
    read: read,
    write: write,
    find: find,
    remove: remove,
    get: get,
    save: save,
    removeAll: removeAll
};

function write(data, cb) {
    actions.log('write:start=' + JSON.stringify(data));
    var writestream = gfs.createWriteStream({
        filename: data.name
    });
    fs.createReadStream(path.join(__dirname + '/files/' + data.path)).pipe(writestream);
    writestream.on('close', function(file) {
        var msg = file.filename + 'Written To DB';
        actions.log(msg);
        cb(null, msg);
    });
};

function read(data, cb) {
    actions.log('read:start=' + JSON.stringify(data));
    var fs_write_stream = fs.createWriteStream('file_' + data.name + '_' + generatePassword(8) + '_.txt');
    var readstream = gfs.createReadStream({
        filename: data.name
    });
    readstream.pipe(fs_write_stream);
    fs_write_stream.on('close', function() {
        var msg = 'read:rta=file ' + data.name + ' has been written fully!';
        actions.log(msg);
        cb(null, msg);
    });
}

function get(data, cb) {
    actions.log('get:start=' + JSON.stringify(data));
    if (!data._id) return cb({ message: '_id required!' });
    var readstream = gfs.createReadStream({
        _id: mongoose.Types.ObjectId(data._id)
    });
    readstream.on('error', function(err) {
        console.log('An error occurred!', err);
        throw err;
    });

    find(data, (err, file) => {
        var rta = file;
        actions.log('get:end=' + JSON.stringify(rta));
        rta.stream = readstream;
        cb(null, rta);
    });
}

//save a file (type=file need to be the last item of the form.)
function save(data, cb, req, res) {
    actions.log('save:start=' + JSON.stringify(data));
    if (req.busboy) {
        var requiredFileds = ['name', 'mimetype', 'file'];

        function _streamToDb(data) {
            actions.log('save:_streamToDb=' + JSON.stringify(Object.keys(data)));
            data.file.pipe(gfs.createWriteStream({
                filename: data.name,
                mode: 'w',
                chunkSize: 1024,
                content_type: data.mimetype
            })).on('close', function(file) {
                var msg = file.filename + ' written To DB';
                actions.log(msg);
                cb(null, {
                    result: file,
                    message: msg
                });
            })
        }

        var interval = setInterval(() => {
            var success = true;
            requiredFileds.forEach((k) => {
                if (!data[k]) {
                    actions.log('save:waiting for property ' + k + ' in data.');
                    success = false;
                }
            });
            if (success) {
                clearInterval(interval);
                _streamToDb(data);
            }
        }, 1000);
        req.busboy.on('field', function(key, value, keyTruncated, valueTruncated) {
            //console.log('save:field=', key, value, keyTruncated, valueTruncated);
            data[key] = value;
        });
        req.busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
            //console.log('save:file=', fieldname, inspect(file), filename, encoding, mimetype);
            data.file = file;
            data.mimetype = mimetype;
        });

        req.pipe(req.busboy);

        //console.info('query',req.query);
        //console.info('params',req.params);
        //console.info('body',req.body);
    } else {
        actions.log('save:error= busboy required.');
        return cb('busboy requried', null);
    }
}

function exists(data, cb) {
    actions.log('exists:start=' + JSON.stringify(data));
    var options = { filename: data.name }; //can be done via _id as well
    gfs.exist(options, function(err, found) {
        if (err) return cb(err, null);
        actions.log('exists:rta=' + found);
        cb(null, (found ? true : false));
    });
}

function find(data, cb) {
    actions.log('find:start=' + JSON.stringify(data));
    var opt = {};
    if (data.name) {
        opt = { filename: data.name };
    } else {
        opt = data;
    }

    if (opt._id) {
        gfs.findOne({_id:opt._id},function(err, file) {
            if (err) return cb(err, null);
            actions.log('find:rta=' + JSON.stringify(file));
            cb(null, file);
        });
    } else {
        gfs.files.find(opt).toArray(function(err, files) {
            if (err) return cb(err, null);
            var ff = files.map((f) => ({ _id: f._id, filename: f.filename }));
            actions.log('find:rta=' + JSON.stringify(ff));
            cb(null, files);
        });
    }


}

function remove(data, cb) {
    actions.log('remove:start=' + JSON.stringify(data));
    var opt = {};
    if (data._id) opt._id = data._id;
    else if (data.name) opt.filename = data.name;
    else return cb({ message: '_id or name required!' });
    gfs.remove(opt, (err) => {
        if (err) return cb(err, null);
        actions.log('remove:rta=' + JSON.stringify(true));
        cb(null, true);
    });
}

function removeAll(data, cb) {
    actions.log('removeAll:start=' + JSON.stringify({}));
    find({}, (err, files) => {
        if (err) return cb(err, files);
        files.forEach(file => {
            remove({ _id: file._id }, () => {});
        });
    });
    cb(null, true);
}

function streamToString(stream, cb) {
    const chunks = [];
    stream.on('data', (chunk) => {
        chunks.push(chunk);
    });
    stream.on('end', () => {
        cb(chunks.join(''));
    });
}

