
console.log('~');
console.log(`HTTP URL: ${process.env.HTTP_URL}`);
console.log('Deploying external queue worker http...');

require('../../utils/load.env');

/**
 * Handle input arguments
 */
var args = process.argv.slice(2);

const service_name = args[0];
const worker = args[1];
const address = args[2];
const queue = `external.worker.${service_name}.${worker}.http`;

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
	const { retry_ex, _ } = await QueueUtils.initRetryEx(channel, q);

	console.log("[*] Waiting for messages in %s. To exit press CTRL+C", queue);
	
	channel.consume(queue, function(msg){
		console.log('\n~~');
		console.log(`[->] Receive message: ${msg.content.toString()}`);

		graceful.run();

		require('../../modes/ext.http')(
			{
				address: address,
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