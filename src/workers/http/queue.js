
console.log('~');
console.log(`HTTP URL: ${process.env.HTTP_URL}`);
console.log('Deploying work queue http...');

/**
 * Load environment
 */
require('dotenv').config();

/**
 * Load ROOT DIR
 */
const root = require("app-root-path");

/**
 * Handle input arguments
 */
var args = process.argv.slice(2);

const app = args[0];
const worker = args[1];
const queue = `worker.${app}.${worker}`;

/**
 * Consumer
 */
const { errorOutput, dataOutput } = require(`${root}/utils/output`)
const Queue = require(`${root}/brokers/rabbitmq/queue`);

Queue.build(queue, (queue_utils) => {

	console.log('Listen from worker:', worker);
	console.log(`[*] Waiting for messages from ${queue}. To exit press CTRL+C"`);

	/**
	 * Graceful shutdown
	 */
	const GracefulUtils = require(`${root}/utils/graceful`);
	const graceful = new GracefulUtils(() => {
		Queue.destruct();
	});

	/**
	 * Define consumer
	 */
	queue_utils.consume((msg) => {
		console.log('\n~');
		console.log(`[->] Receive message: ${msg.content.toString()}`);

		graceful.run();

		require(`${root}/modes/app.http`)(
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