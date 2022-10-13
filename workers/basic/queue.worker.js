
console.log('~');
console.log(`Success root: ${process.env.SUCCESS_ROOT}`);
console.log('Deploying work queue...');

require('../../utils/load.env');

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

const GracefulUtils = require('../../utils/graceful');
const graceful = new GracefulUtils();
graceful.graceful();

const { errorOutput, dataOutput } = require('../../utils/output')
const QueueUtils = require('../../utils/queue');

QueueUtils.initChannel(async (channel) => {

	// declare entry exchange

	// declare queue & exchange and binding
	const q = await QueueUtils.initQueue(channel, queue);
	const { retry_ex, _ } = await QueueUtils.initRetryEx(channel, q);
	

	console.log("[*] Waiting for messages in %s. To exit press CTRL+C", q.queue);

	channel.consume(q.queue, function(msg){

		console.log('\n~~');
		console.log(`[->] Receive message: ${msg.content.toString()}`);

		graceful.run();

		require('../../utils/spawn')(
			{
				app: app,
				worker: worker,
				msg: msg.content.toString(),
			},
			(data) => dataOutput(data, queue),
			(data) => errorOutput(data, queue),
			() => QueueUtils.onSuccess(channel, msg),
			() => QueueUtils.onFailure(channel, msg, retry_ex, queue),
			() => graceful.stop()
		);
	}, {
		noAck: false,
	});
});