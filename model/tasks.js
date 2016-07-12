var tasks = [
  //  require('./tasks/task.diplomeExpiration'),
    require('./tasks/task.deleteTemporalFiles'),
    require('./tasks/task.diags-remove-unpaid-orders')
];

try{
    console.log('TASKS config load start for',process.env.APPNAME);
    tasks = require('../config/config.'+process.env.APPNAME.toLowerCase()).tasks();
    tasks = tasks.map(n=>require('./tasks/task.'+n));
    console.log('TASKS config load success for',process.env.APPNAME);
}catch(e){
    console.log('TASKS config load fail for',process.env.APPNAME);
}

exports.configure = (app) => {
    tasks.forEach((t) => {
        function loop() {
            console.log('task-manager:start: ' + t.name);
            try {
                t.handler(t, app);
            }
            catch (e) {
                console.log('task-manager-exception', e);
            }
        }
        setInterval(() => {
            loop
        }, t.interval);


        if (t.startupInterval) {
            loop();
        }
        else {
            if (t.startupIntervalDelay) {
                setTimeout(loop, t.startupIntervalDelay || 0);
            }
        }
    });
}
