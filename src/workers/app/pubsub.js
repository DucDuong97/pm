
console.log('~');
console.log(`HTTP URL: ${process.env.HTTP_URL}`);
console.log('Deploying pubsub queue http...');

/**
 * Load environment
 */
require('dotenv').config();

/**
 * Load ROOT DIR
 */
const root = require("app-root-path") + "/src";

/**
 * Handle input arguments
 */
var args = process.argv.slice(2);

const app = args[0];
const worker = args[1];
const topic = args[2];
const topic_type = args[3];

/**
 * Init consumer
 */
const { errorOutput, dataOutput } = require(`${root}/utils/output`)

const Pubsub = require(`${root}/brokers/rabbitmq/pubsub`);

Pubsub.build(topic, topic_type, (queue_utils) => {

	console.log('Listen from topic:', topic);
	console.log("[*] Waiting for messages in worker: %s. To exit press CTRL+C", worker);

	/**
	 * Graceful shutdown
	 */
	const GracefulUtils = require(`${root}/utils/graceful`);
	const graceful = new GracefulUtils(() => {
		Pubsub.destruct();
	});
	graceful.graceful();

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
			(data) => dataOutput(data, worker),
			(data) => errorOutput(data, worker),
			() => queue_utils.success(msg),
			() => queue_utils.failure(msg),
			() => queue_utils.retry(msg),
			() => graceful.stop()
		);
	});
});
