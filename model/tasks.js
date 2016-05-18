var diplomeExpirationTask   = require('./tasks/task.diplomeExpiration');
var deleteTemporalFiles     = require('./tasks/task.deleteTemporalFiles');
var tasks = [
    diplomeExpirationTask,
    deleteTemporalFiles
];
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
        
        
        if(t.startupInterval){
            loop();
        }else{
            if(t.startupIntervalDelay){
                setTimeout(loop,t.startupIntervalDelay);
            }
        }
    });
}
