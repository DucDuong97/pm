

require('dotenv').config({path:require("path").basename(__dirname)+`/.env`});

const { spawn } = require('child_process');
const { writeLog } = require('./helper');

console.log('~');
console.log('Deploying pubsub queue...');

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

initChannel((channel) => {

	const dl_args = initDLX(channel);
		
	channel.assertExchange(
		queue,
		'fanout',
		{durable: false}
	);

	channel.assertQueue('', {
		durable: true,
		exclusive: true,
		arguments: {
			...dl_args,
		}
	}, function (error, q) {

		console.log('pubsub:', q.queue);

		channel.bindQueue(q.queue, queue, '');

		channel.prefetch(1);
		console.log("[*] Waiting for messages in %s. To exit press CTRL+C", queue);
		
		channel.consume(q.queue, function(msg){

			console.log('~');
			console.log(" [x] Received %s", msg.content.toString());

			const child = spawn(
				'php', [
					process.env.SUCCESS_ROOT+'/bin/work.resolve.php', 
					'--app', app,
					'--worker', worker,
					'--msg', msg.content.toString(),
				],
			);

			child.stdout.on('data', (data) => {
				console.log(`child stdout: ${data}`);
				writeLog(data, queue);
			});

			child.on('exit', function (code, signal) {
				console.log('Exit: child process exited with ' +
						`code ${code} and signal ${signal}`);
				
				// if exit code == 0 (means that script ends without errors) ack
				if (code == 0){
					console.log("[x] Done");
					channel.ack(msg);
				}

				//TODO: if exit code != 0 (means that script ends due to uncaught errors) nack
				if (code != 0){
					console.log("[x] Execution fail");
					channel.nack(msg, false, false);
				}

				//TODO: if exit code == NULL (means that process is killed) retry
			});

			child.on('error', function (code, signal) {
				console.log('Error: child process exited with ' +
						`code ${code} and signal ${signal}`);
			});
			
		}, {
			noAck: false,
		});
		
	});
});

process.on('message', function(msg) {
	if (msg == 'shutdown') {
		writeLog('Finished closing connections', queue);
		setTimeout(function() {
			process.exit(0);
		})
	}
})