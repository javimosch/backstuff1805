var diplomeExpirationTask = require('./programmedTasks.diplomeExpiration');

//console.log('programmedTasks#1 : '+JSON.stringify(Object.keys(diplomeExpirationTask)||[]));

var tasks = [
    diplomeExpirationTask
];

//task:
/*
{
	name:'Example programmed task',
	interval: 10000 //runs each 10 seconds
	handler:()=>{}
}
*/


exports.configure = (app) => {
    tasks.forEach((t) => {

        function loop() {
            console.log('ProgrammedTask-start: ' + t.name);
            try {
                t.handler(t, app);
            }
            catch (e) {
                console.log('ProgrammedTask-exception', e);
            }
        }

        setInterval(() => {
            loop
        }, t.interval);
        
        
        if(t.startupInterval){
            loop();
        }

    });
}
