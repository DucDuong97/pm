
require('../../utils/load.env');

console.log('~');
console.log(`HTTP URL: ${process.env.HTTP_URL}`);
console.log('Deploying work queue http...');

/**
 * Handle input arguments
 */
var args = process.argv.slice(2);

const app = args[0];
const worker = args[1];
const queue = `worker.${app}.${worker}`;

/**
 * Graceful shutdown
 */
const GracefulUtils = require('../../utils/graceful');
const graceful = new GracefulUtils();
graceful.graceful();

/**
 * Consumer
 */
const { errorOutput, dataOutput } = require('../../utils/output')
const QueueUtils = require('../../queue/queue');

QueueUtils.initChannel(async (channel) => {
	const q = await QueueUtils.initQueue(channel, queue);
	const retry_ex = await QueueUtils.initRetryEx(channel, q);

	console.log("[*] Waiting for messages in %s. To exit press CTRL+C", queue);
	
	channel.consume(queue, function(msg){
		console.log('\n~');
		console.log(`[->] Receive message: ${msg.content.toString()}`);

		graceful.run();

		require('../../modes/app.http')(
			{
				app: app,
				worker: worker,
				msg: msg.content.toString(),
			},
			(data) => dataOutput(data, queue),
			(data) => errorOutput(data, queue),
			() => QueueUtils.onSuccess(channel, msg),
			() => QueueUtils.onFailure(channel, msg, retry_ex, q),
			() => graceful.stop()
		);
	}, {
		noAck: false,
	});
});