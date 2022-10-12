
const ROOT = require("path").dirname(__dirname);
const ENV_EXT = process.env.NODE_ENV == 'development' ? '':'.local';

require('dotenv').config({ path:`${ROOT}/.env${ENV_EXT}` });

const { spawn } = require('child_process');
const { writeLog } = require('../../utils/log');
const { initRetryEx, initQueue, initChannel } = require('../../utils/queue');
const RetryUtils = require('../../utils/retry')

console.log('~');
console.log(`Success root: ${process.env.SUCCESS_ROOT}`);
console.log('Deploying work queue...');

/**
 * Handle input arguments
 */
var args = process.argv.slice(2);

const app = args[0];
const worker = args[1];


const queue = `worker.${app}.${worker}`;

/**
 * Define queue
 */

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

initChannel(async (channel) => {

	// declare entry exchange

	// declare queue & exchange and binding
	const q = await initQueue(channel, queue);
	const { retry_ex, retry_q } = await initRetryEx(channel, q);
	

	console.log("[*] Waiting for messages in %s. To exit press CTRL+C", q.queue);

	channel.consume(q.queue, function(msg){

		const retryUtils = new RetryUtils(msg);

		console.log('\n~~');
		let retry_count = retryUtils.getRetryCount();
		console.log(`[->] Receive message: ${msg.content.toString()} | retry count: ${retry_count}`);

		running = true;
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

		child.stderr.on('data', (data) => {
			console.log(`child stderr: ${data}`);
			writeLog(data, queue);
		});

		child.on('exit', function (code, signal) {
			console.log('Exit: child process exited with ' +
					`code ${code} and signal ${signal}`);
			
			// if exit code == 0 (means script ends without errors) ack
			if (code == 0){
				console.log(" [x] Done");
				channel.ack(msg);
			}

			// if exit code != 0 (means script ends due to PHP uncaught errors) to DLX
			if (code != 0){
				console.log(" [x] Execution fail");
				
				// ack, worker explicitly send failed msg to retry queue
				channel.ack(msg);

				// retry
				retryUtils.retry(channel, retry_ex, q);
			}

			// if exit code == NULL (means that process is killed) requeue
			// if (code == null){
			// 	console.log("[x] Child process dies");
			// 	channel.nack(msg);
			// }
		
			running = false;
		});
	}, {
		noAck: false,
	});
});