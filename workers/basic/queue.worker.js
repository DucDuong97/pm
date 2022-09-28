

require('dotenv').config({path:require("path").dirname(__dirname)+`/.env${process.env.NODE_ENV == 'development' ? '':'.local'}`});

const { spawn } = require('child_process');
const { writeLog } = require('../../utils/log');
const { initAsyncChannel, initQueue, initRetryEx } = require('../../utils/queue');

console.log('~~');
console.log('Deploying work queue...');

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

initAsyncChannel(async (channel) => {
	try {
		// initQueue(channel, queue);

		const q = await channel.assertQueue(queue, {durable: true, autoDelete: false});

		const entry_ex = await channel.assertExchange('entry.exchange', 'direct', {durable: true});

		const { retry_ex, retry_q } = await initRetryEx(channel, q);

		// bind queue
		channel.bindQueue(q.queue, entry_ex.exchange, 'user.created');
		channel.bindQueue(q.queue, entry_ex.exchange, q.queue);
		channel.bindQueue(retry_q.queue, retry_ex.exchange, 'user.created');
		channel.bindQueue(retry_q.queue, retry_ex.exchange, q.queue);


		console.log("[*] Waiting for messages in %s. To exit press CTRL+C", q.queue);

		channel.consume(q.queue, function(msg){

			if (!msg.properties.headers['x-retries']){
				msg.properties.headers['x-retries'] = 0;
			}
			if (!msg.properties.headers['basic-retry-delay']){
				msg.properties.headers['basic-retry-delay'] = process.env.BASIC_RETRY_DELAY || 3000;
			}

			console.log('\n******************')
			let retry_count = msg.properties.headers['x-retries'];
			console.log(`[->] Receive message: ${msg.content.toString()} | retry count: ${retry_count}`);

			running = true;
			const child = spawn(
				'php', [
					process.env.SUCCESS_ROOT+'/bin/work.resolve.php',
					'--app', app,
					'--worker', worker,
					'--msg', msg.content.toString(),
					'--nosql'
				],
			);

			child.stdout.on('data', (data) => {
				// console.log(`child stdout: ${data}`);
				writeLog(data, queue);
			});

			child.stderr.on('data', (data) => {
				// console.log(`child stderr: ${data}`);
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
					
					
					// ack
					channel.ack(msg);

					// retry
					const retry_delay = ++retry_count * msg.properties.headers['basic-retry-delay'];
					if (retry_count <= 3){
						// Retry mechanism
						console.log(` [x] Publishing to retry exchange with ${retry_delay/1000}s delay`);
						
						const msg_options = {
							expiration: retry_delay,
							headers: {
								'x-retries': retry_count,
								'basic-retry-delay': msg.properties.headers['basic-retry-delay']
							}
						}

						// send to retry queue
						console.log(` [x] Message will be sent back to exchange: ${retry_ex.exchange}`)

						channel.publish(retry_ex.exchange, q.queue, Buffer.from(msg.content.toString()), msg_options);
					} else {
						// send to dead letter queue
						// TODO: consider what information of message to publish to dead letter queue
						console.log(` [x] Worker fail processing task`)
						console.log(` [x] Retry exceed limit (3). Message will be sent to dead letter queue!`);
						channel.publish(retry_ex.exchange, 'retry.fail', Buffer.from(JSON.stringify(msg)));
					}
				}

				// if exit code == NULL (means that process is killed) requeue
				if (code == null){
					console.log("[x] Child process dies");
					channel.nack(msg);
				}
			
				running = false;
			});
		}, {
			noAck: false,
		});
	} catch (err){
		writeLog(err, q.queue);
		throw err;
	}
});