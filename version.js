var fs = require('fs');
var config = JSON.parse(fs.readFileSync(process.cwd()+'/package.json'));

function replace(str,w1,w2){
    var rta = '';
    for(var x=0;x<str.length;x++){
        if(str.charAt(x)==w1){
            rta+= w2;
        }else{
            rta+=str.charAt(x);
        }
    }
    return rta;
}

var versionFrom = config.version;
var v = config.version;
v = replace(v,'.','');
v = parseInt(v);
v++;
var versionTo = '';
var add = false;
for(var x = 0;x<v.toString().length;x++){
    if(!add){
        add = true;
        versionTo+= v.toString().charAt(x);
    }else{
        versionTo+= '.' + v.toString().charAt(x) +'.';
        add = false;
    }
}

config.version = versionTo;

fs.writeFileSync(process.cwd()+'/package.json',JSON.stringify(config));

console.log('version changed from',versionFrom,'to',versionTo);