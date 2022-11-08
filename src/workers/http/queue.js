
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
const Queue = require('../../queue/queue');

Queue.build(queue, (queue_utils) => {
	queue_utils.consume((msg) => {
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
			() => queue_utils.success(msg),
			() => queue_utils.failure(msg),
			() => queue_utils.retry(msg),
			() => graceful.stop()
		);
	});
});