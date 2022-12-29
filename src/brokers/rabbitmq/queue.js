

const amqp = require('amqplib');

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

	/**
	 * @type {asyncAmqp.Connection}
	 */
	static _conn = null;

	/**
	 * @type {asyncAmqp.Channel}
	 */
	static _chan = null;

	static async initChannel(cb){
		await this._initChannel();
		cb(this._chan);
		// this.destruct();
	}

	static destruct(){
		this._chan.close();
		this._conn.close();

		this._chan = null;
		this._conn = null;
	}

	/**
	 * @returns {asyncAmqp.Channel}
	 */
	static async _initChannel(vhost = ''){
		if (this._chan){
			console.log("Return cached Channel");
			return this._chan;
		}
		console.log("Open new channel");

		this._conn = await amqp.connect(`amqp://${process.env.RBMQ_HOST}:${process.env.RBMQ_PORT}/${vhost}`);
		this._conn.on('error', (err) => {
			console.log("Connection error");
			console.log(err);
		});
		this._conn.on('close', (err) => {
			console.log("Conneciton closed");
			this._conn = null;
		});
		this._chan = await this._conn.createChannel();
		this._chan.on('error', (err) => {
			console.log("Channel error");
			console.log(err);
			this._chan = null;
		});
		this._chan.on('close', (err) => {
			console.log("Channel closed");
			this._chan = null;
		});

		this._chan.prefetch(1);
		 
		return this._chan;
	}

	static async build(vhost, name, cb){
		const channel = await this._initChannel(vhost);

		if (!name || name == ''){
			console.log("Invalid queue name");
			process.exit();
		}

	
		const q = await channel.assertQueue(name, {
			durable: true,
			autoDelete: false,
		});

		/**
		 * build retry mechanism
		 */
		const {retry_key, dead_key, exceed_key} = await this.initRetryMechanism(q.queue);

		cb(new Queue({

			channel, 
			
			queue: q.queue,
			
			retry_key, dead_key, exceed_key,
		}));
	}

	static async initRetryMechanism(queue_name, is_pubsub = false){
		await this._chan.assertExchange(RETRY_EX, 'direct', {
			durable: true,
			autoDelete: false,
		});
		const requeue_ex = await this._chan.assertExchange(REQUEUE_EX, 'direct', {
			durable: true,
			autoDelete: false,
		});

		const alias = is_pubsub ? "pubsub":queue_name;

		const retry_q = await this._chan.assertQueue(`${alias}.retry`, {
			durable: true,
			arguments: {
				'x-dead-letter-exchange': REQUEUE_EX,
				'x-dead-letter-routing-key': queue_name,
			}
		});
		const exceed_q = await this._chan.assertQueue(`${alias}.retries.exceed`, {
			durable: true,
			autoDelete: false
		});
		const dead_q = await this._chan.assertQueue(`${alias}.dead.letter`, {
			durable: true,
			autoDelete: false
		});

		// bind
		this._chan.bindQueue(retry_q.queue,  RETRY_EX, retry_q.queue);
		this._chan.bindQueue(exceed_q.queue, RETRY_EX, exceed_q.queue);
		this._chan.bindQueue(dead_q.queue,   RETRY_EX, dead_q.queue);

		this._chan.bindQueue(queue_name, requeue_ex.exchange, queue_name);

		return {
			retry_key: retry_q.queue,
			dead_key: dead_q.queue,
			exceed_key: exceed_q.queue
		}
	}

	consume = async (cb) => {
		
		process.on('uncaughtException', (error, source) => {
			console.log("[x] Uncaught Exception");
			console.log(error);
		});
	
		console.log("[*] Waiting for msg in queue: %s", this.queue);
	
		this.channel.consume(this.queue, async (msg) => {
			await cb(msg);
		}, {
			// manual acknowledgment mode
			noAck: false
		});
	};

	success(msg){
		console.log(" [x] Done");
		this.channel.ack(msg);
	}

	failure(msg){
		console.log("[x] Execution failed!!");
		console.log(`[x] Message sent to '${this.dead_key}'!`);

		this.channel.publish(RETRY_EX, this.dead_key, Buffer.from(msg.content));
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
			// Retry mechanism
			console.log("[x] Retrying...");
			console.log(`[x] Publishing to ${RETRY_EX}, routing key ${this.retry_key} with ${next_delay/1000}s delay`);
			
			const msg_options = {
				expiration: next_delay,
				headers: {
					'x-retries': retry_count + 1
				}
			};
			this.channel.publish(RETRY_EX, this.retry_key, Buffer.from(msg.content), msg_options);
		} else {
			// send to retries exceed queue
			console.log(`[x] Retry times exceeds`)
			console.log(`[x] Retry exceed limit (${MAX_RETRIES}). Message sent to '${this.exceed_key}'!`);
			
			this.channel.publish(RETRY_EX, this.exceed_key, Buffer.from(msg.content));
		}
	}
}

module.exports = Queue;