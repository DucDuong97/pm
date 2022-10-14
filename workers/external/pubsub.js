
console.log('~');
console.log(`HTTP URL: ${process.env.HTTP_URL}`);
console.log('Deploying pubsub queue http...');

require('../../utils/load.env');

const QueueUtils = require('../../utils/queue');
const { initEntryEx, initTempQueue, initRetryEx } = require('../../utils/pubsub');
const { errorOutput, dataOutput } = require('../../utils/output')

/**
 * Handle input arguments
 */
var args = process.argv.slice(2);

const service_name = args[0];
const worker = args[1];
const address = args[2];
const topic = args[3];

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

		require('../../utils/ext.http')(
			{
				address: address,
				worker: worker,
				msg: msg.content.toString(),
			},
			(data) => dataOutput(data, topic),
			(data) => errorOutput(data, topic),
			() => QueueUtils.onSuccess(channel, msg),
			() => QueueUtils.onFailure(channel, msg, retry_ex, q.queue),
			() => graceful.stop()
		);
	}, {
		noAck: false,
	});
});