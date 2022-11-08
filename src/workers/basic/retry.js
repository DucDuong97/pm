

require('dotenv').config({path:require("path").dirname(__dirname)+`/.env${process.env.NODE_ENV == 'development' ? '':'.local'}`});

// console.log(process.env.SUCCESS_ROOT+'/bin/work.resolve.php');
// process.exit();

const { spawn } = require('child_process');
const { writeLog } = require('./log.utils');

console.log('~');
console.log('Deploying general queue...');

/**
 * Define queue
 */

const queue = 'general.queue';

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
		arguments: {
			...dl_args,
		}
	});
	channel.prefetch(1);

	console.log("[*] Waiting for messages in %s. To exit press CTRL+C", queue);
	
	channel.consume(queue, function(msg){

		console.log('~~');
		console.log("[x] Received %s", msg.content.toString());

		const data = JSON.parse(msg.content.toString());

		running = true;
		const child = spawn(
			'php', [
				process.env.SUCCESS_ROOT+'/bin/work.resolve.php', 
				'--app', data.app_name,
				'--worker', data.worker_name,
				'--msg', data.message,
			],
		);

		child.stdout.on('data', (data) => {
			console.log(`child stdout: ${data}`);
			writeLog(data, queue);
		});

		child.on('exit', function (code, signal) {
			console.log('Exit: child process exited with ' +
					`code ${code} and signal ${signal}`);
			
			// if exit code == 0 (means script ends without errors) ack
			if (code == 0){
				console.log("[x] Done");
				channel.ack(msg);
			}

			// if exit code != 0 (means script ends due to uncaught errors) to DLX
			if (code != 0){
				console.log("[x] Execution fail");
				channel.nack(msg, false, false);
			}

			// if exit code == NULL (means that process is killed) requeue
			if (code == null){
				console.log("[x] Child process dies");
				channel.nack(msg);
			}
		
			running = false;
		});

		child.on('error', function (code, signal) {
			console.log('Error: child process exited with ' +
					`code ${code} and signal ${signal}`);
			running = false;
		});
	}, {
		noAck: false,
	});
});