
console.log('~');
console.log(`Success root: ${process.env.SUCCESS_ROOT}`);
console.log('Deploying pubsub queue basic...');

require('../../utils/load.env');

const QueueUtils = require('../../queue/queue');
const { initEntryEx, initTempQueue, initRetryEx } = require('../../queue/pubsub');
const { errorOutput, dataOutput } = require('../../utils/output')

/**
 * Handle input arguments
 */
var args = process.argv.slice(2);

const app = args[0];
const worker = args[1];
const topic = args[2];

/**
 * Graceful shutdown
 */
const GracefulUtils = require('../../utils/graceful');
const graceful = new GracefulUtils();
graceful.graceful();

/**
 * Init consumer
 */
QueueUtils.initChannel(async (channel) => {

	// declare entry exchange
	const entry_ex = await initEntryEx(channel, topic)

	// init queue, exchange and binding
	const q = await initTempQueue(channel, entry_ex);
	const { retry_ex } = await initRetryEx(channel, q.queue);

	console.log('pubsub to queue:', q.queue);
	console.log('Listen from topic:', topic);

	console.log("[*] Waiting for messages in %s. To exit press CTRL+C", topic);
	
	await channel.consume(q.queue, function(msg){

		console.log('\n*******');
		console.log(`[->] Receive message: ${msg.content.toString()}`);

		graceful.run();

		require('../../modes/app.spawn')(
			{
				app: app,
				worker: worker,
				msg: msg.content.toString(),
			},
			(data) => dataOutput(data, topic),
			(data) => errorOutput(data, topic),
			() => QueueUtils.onSuccess(channel, msg),
			() => QueueUtils.onFailure(channel, msg, retry_ex, queue),
			() => graceful.stop()
		);
	}, {
		noAck: false,
	});
});