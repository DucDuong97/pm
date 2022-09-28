

require('dotenv').config({
	path:require("path").basename(__dirname)+`/.env${process.env.NODE_ENV == 'development' ? '':'.local'}`});

const { spawn } = require('child_process');
const { writeLog } = require('../../utils/log');

console.log('~');
console.log('Deploying pubsub queue...');

/**
 * Handle input arguments
 */
var args = process.argv.slice(2);

const app = args[0];
const event = args[1];
const worker = args[2];

const topic = `${app}.${event}`;

/**
 * Define queue
 */
const { initAsyncChannel, initChannel, initPubsubRetryEx } = require('../../utils/queue');

initAsyncChannel(async (channel) => {

	const pubsub_ex = await channel.assertExchange(
		topic,
		'fanout',
		{durable: false}
	);

	const {retry_ex, retry_q, resend_ex} = await initPubsubRetryEx(channel);

	const q = await channel.assertQueue('', {
		durable: true, exclusive: true
	});

	console.log('pubsub to queue:', q.queue);

	// bind queue
	channel.bindQueue(q.queue, pubsub_ex.exchange, '');
	channel.bindQueue(q.queue, resend_ex, q.queue);
	channel.bindQueue(retry_q, retry_ex, q.queue);

	channel.prefetch(1);
	console.log("[*] Waiting for messages in %s. To exit press CTRL+C", topic);
	
	await channel.consume(q.queue, function(msg){

		if (!msg.properties.headers['x-retries']){
			msg.properties.headers['x-retries'] = 0;
		}
		if (!msg.properties.headers['basic-retry-delay']){
			msg.properties.headers['basic-retry-delay'] = process.env.BASIC_RETRY_DELAY || 3000;
		}

		let retry_count = msg.properties.headers['x-retries'];

		console.log('\n*******');
		console.log(`[->] Receive message: ${msg.content.toString()} | retry count: ${retry_count}`);

		const child = spawn(
			'php', [
				process.env.SUCCESS_ROOT+'/bin/work.resolve.php', 
				'--app', app,
				'--worker', worker,
				'--msg', msg.content.toString(),
			],
		);

		child.stdout.on('data', (data) => {
			// console.log(`child stdout: ${data}`);
			writeLog(data, topic);
		});

		child.on('exit', function (code, signal) {
			console.log('Exit: child process exited with ' +
					`code ${code} and signal ${signal}`);
			
			// if exit code == 0 (means that script ends without errors) ack
			if (code == 0){
				console.log("[x] Done");
				channel.ack(msg);
			}

			//TODO: if exit code != 0 (means that script ends due to retriable errors) nack
			if (code != 0){
				console.log(` [x] Rejecting message!`);

				// should ack
				channel.ack(msg);
				
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
					console.log(` [x] Message will be sent back to exchange: ${retry_ex}`)

					channel.publish(retry_ex, q.queue, Buffer.from(msg.content.toString()), msg_options);
				} else {
					// send to dead letter queue
					// TODO: consider what information of message to publish to dead letter queue
					console.log(` [x] Worker fail processing task`)
					console.log(` [x] Retry exceed limit (3). Message will be sent to dead letter queue!`);
					channel.publish(retry_ex, 'dead', Buffer.from(JSON.stringify(msg)));
				}
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

process.on('message', function(msg) {
	if (msg == 'shutdown') {
		writeLog('Finished closing connections', topic);
		setTimeout(function() {
			process.exit(0);
		})
	}
})