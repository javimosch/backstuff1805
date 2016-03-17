
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


exports.configure=(app)=>{
	tasks.forEach((t)=>{

		setInterval(()=>{
			console.log('ProgrammedTask-start: '+t.name);
			t.handler(t,app);
		},t.interval);

	});
}