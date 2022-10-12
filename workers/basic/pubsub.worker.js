
const ROOT = require("path").dirname(__dirname);
const ENV_EXT = process.env.NODE_ENV == 'development' ? '':'.local';

require('dotenv').config({ path:`${ROOT}/.env${ENV_EXT}` });

const { writeLog } = require('../../utils/log');
const { initChannel } = require('../../utils/queue');
const { initEntryEx, initTempQueue, initRetryEx } = require('../../utils/pubsub');
const RetryUtils = require('../../utils/retry');

console.log('~');
console.log(`Success root: ${process.env.SUCCESS_ROOT}`);
console.log('Deploying pubsub queue basic...');

/**
 * Handle input arguments
 */
var args = process.argv.slice(2);

const app = args[0];
const worker = args[1];
const topic = args[2];


/**
 * Init consumer
 */
initChannel(async (channel) => {

	// declare entry exchange
	const entry_ex = await initEntryEx(channel, topic)

	// init queue, exchange and binding
	const q = await initTempQueue(channel);
	const { retry_ex } = await initRetryEx(channel, entry_ex, q);

	console.log('pubsub to queue:', q.queue);
	console.log('Listen from topic:', topic);

	channel.prefetch(1);
	console.log("[*] Waiting for messages in %s. To exit press CTRL+C", topic);
	
	await channel.consume(q.queue, function(msg){

		const retryUtils = new RetryUtils(msg);

		let retry_count = retryUtils.getRetryCount();

		console.log('\n*******');
		console.log(`[->] Receive message: ${msg.content.toString()} | retry count: ${retry_count}`);

		const { spawn } = require('child_process');
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
			writeLog(data, topic);
		});

		child.on('exit', function (code, signal) {
			console.log('Exit: child process exited with ' +
					`code ${code} and signal ${signal}`);
			
			// if exit code == 0 (means that script ends without errors) ack
			if (code == 0){
				console.log(" [x] Done");
				channel.ack(msg);
			}

			//TODO: if exit code != 0 (means that script ends due to retriable errors) nack
			if (code != 0){
				console.log(` [x] Rejecting message!`);

				// should ack
				channel.ack(msg);
				
				// retry
				retryUtils.retry(channel, retry_ex, q);
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