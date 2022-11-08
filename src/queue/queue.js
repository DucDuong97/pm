

const asyncAmqp = require('amqplib');

const BASIC_RETRY_DELAY = process.env.BASIC_RETRY_DELAY || 1000;
const MAX_RETRIES = process.env.MAX_RETRIES || 2;
const RETRY_EX = process.env.RETRY_EX || 'retry.ex';
const REQUEUE_EX = process.env.REQUEUE_EX || 'requeue.ex';


class Queue {

	constructor(async_params){
		this.channel 	= async_params.channel;
		this.queue 		= async_params.queue;

		this.retry_key 	= async_params.retry_key;
		this.dead_key 	= async_params.dead_key;
		this.exceed_key = async_params.exceed_key;
	}

	static async build(name, cb){
		const conn =  await asyncAmqp.connect(process.env.AMQP_URL);
		const channel = await conn.createChannel();

		channel.prefetch(1);

		if (!name || name == ''){
			console.log("Invalid queue name");
			process.exit();
		}

	
		const q = await channel.assertQueue(name, {
			durable: true,
			autoDelete: false,
		});

		await channel.assertExchange(RETRY_EX, 'direct', {
			durable: true,
			autoDelete: false,
		});
		await channel.assertExchange(REQUEUE_EX, 'direct', {
			durable: true,
			autoDelete: false,
		});

		const retry_q = await channel.assertQueue(`${q.queue}.retry`, {
			durable: true, autoDelete: false,
			arguments: {
				'x-dead-letter-exchange': 'requeue.exchange',
			}
		});
		const exceed_q = await channel.assertQueue(`${q.queue}.retries.exceed`, {
			durable: true,
			autoDelete: false
		});
		const dead_q = await channel.assertQueue(`${q.queue}.dead.letter`, {
			durable: true,
			autoDelete: false
		});

		// bind
		channel.bindQueue(retry_q.queue,  RETRY_EX, retry_q.queue);
		channel.bindQueue(exceed_q.queue, RETRY_EX, exceed_q.queue);
		channel.bindQueue(dead_q.queue,   RETRY_EX, dead_q.queue);

		channel.bindQueue(q.queue, REQUEUE_EX, q.queue);

		cb(new Queue({

			channel, 
			
			queue: q.queue,
			
			retry_key: dead_q.queue,
			dead_key: dead_q.queue,
			exceed_key: exceed_q.queue
		}));
	}

	consume = async (cb) => {
		
		process.on('uncaughtException', (error, source) => {
			console.log("[x] Uncaught Exception");
			console.log(error);
		});
	
		console.log(" [*] Waiting for video in %s", this.queue);
	
		this.channel.consume(this.queue, async (msg) => {
	
			await cb(msg);
			this.channel.ack(msg);
		}, {
			// manual acknowledgment mode
			noAck: false
		});
	};

	success(msg){
		console.log(" [x] Done");
	}

	failure(msg){
		console.log(" [x] Execution failed!!");
		console.log(` [x] Message sent to '${this.dead_key}'!`);
		
		const msg_options = {
			headers: {
				'failure-reason': msg.reason
			}
		};
		this.channel.publish(RETRY_EX, this.dead_key, Buffer.from(msg.content), msg_options);
	}

	retry(msg){

		if (!msg.properties.headers){
			msg.properties.headers = {};
		}
		if (!msg.properties.headers['x-retries']){
			msg.properties.headers['x-retries'] = 0;
		}
		
		const retry_count = msg.properties.headers['x-retries'];
		const next_delay = (retry_count + 1) * BASIC_RETRY_DELAY;
		
		if (retry_count < MAX_RETRIES){
			console.log(" [x] Retrying...");
			// Retry mechanism
			console.log(` [x] Publishing to ${RETRY_EX}, routing key ${this.retry_key} with ${next_delay/1000}s delay`);
			
			const msg_options = {
				expiration: next_delay,
				headers: {
					'x-retries': retry_count + 1,
					'retry-reason': reason
				}
			};
			this.channel.publish(RETRY_EX, this.retry_key, Buffer.from(msg.content), msg_options);
		} else {
			// send to retries exceed queue
			console.log(` [x] Retry times exceeds`)
			console.log(` [x] Retry exceed limit (${MAX_RETRIES}). Message sent to '${this.exceed_key}'!`);
			
			const msg_options = {
				headers: {
					'retry-reason': reason
				}
			};
			this.channel.publish(RETRY_EX, this.exceed_key, Buffer.from(msg.content), msg_options);
		}
	}
}

module.exports = Queue;