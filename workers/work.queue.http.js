

require('dotenv').config({path:require("path").dirname(__dirname)+`/.env`});


const { spawn } = require('child_process');
const { writeLog } = require('./log.utils');

console.log('~~');
console.log('Deploying work queue http...');
console.log(process.env.SUCCESS_ROOT);
console.log(process.env.HTTP_URL);

/**
 * Handle input arguments
 */
var args = process.argv.slice(2);

const app = args[0];
const worker = args[1];

const queue = `${app}.${worker}`;


/**
 * Define queue
 */
const { initChannel, initDLX } = require('./queue.utils');

var running = false;

process.on('message', function(msg) {
	if (msg == 'shutdown') {
		setTimeout(async function() {
			console.log('~');
			console.log('GRACEFUL SHUTDOWN: start');
			while (running){
				console.log('GRACEFUL SHUTDOWN: a process is still running. Sleep...');
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
			console.log('GRACEFUL SHUTDOWN: successful');
			process.exit(0);
		});
	}
});

initChannel((channel) => {
	const dl_args = initDLX(channel);

	channel.assertQueue(queue, {
		durable: true,
		autoDelete: true,
		arguments: {
			...dl_args,
		}
	});
	channel.prefetch(1);

	console.log("[*] Waiting for messages in %s. To exit press CTRL+C", queue);
	
	channel.consume(queue, function(msg){

		console.log('~');
		console.log("[x] Received %s", msg.content.toString());

		running = true;
		require('./http.utils').send(app, worker, msg.content.toString(), function(code){
			
			console.log(`Message: ${code.message}`);
			writeLog('Message:'+code.message, queue);
			console.log(`Output: ${code.data}`);
			writeLog('Output:'+code.data, queue);
			
			if (code == 1){
				console.log("[x] Done");
				channel.ack(msg);
			}
			if (code != 1){
				console.log("[x] Execution fail");
				channel.nack(msg, false, false);
			}
			running = false;
		}, function(err){
			writeLog(err, queue);
			console.log("[x] Connection error");
			channel.ack(msg);
			running = false;
		});
	}, {
		noAck: false,
	});
});