
const amqp = require('amqplib/callback_api');
const asyncAmqp = require('amqplib');

const BASIC_RETRY_DELAY = process.env.BASIC_RETRY_DELAY || 1000;
const MAX_RETRIES = process.env.MAX_RETRIES || 2;

exports._initChannel = (callback) => {
	console.log(`Connect to RBMQ: ${process.env.AMQP_URL}`);

	amqp.connect(process.env.AMQP_URL, function(error0, connection) {
		if (error0) {
			throw error0;
		}

		connection.createChannel(function(error1, channel) {
			if (error1) {
				throw error1;
			}

			callback(channel);

		});
	});
}


const _initDLX = (channel) => {

	channel.assertExchange(
		'dead.letter.exchange',
		'direct',
		options = {
			durable: true,
			autoDelete: true,
		},
		function (error2, ex) {
			if (error2) throw error2;
			channel.assertQueue(
				'dead.letter.queue',
				options = {durable: true, autoDelete: false},
				function (error3, q) {
					if (error3) throw error3;
					channel.bindQueue(q.queue, ex.exchange, 'retry.fixed.delay');
				}
			);
		}
	);

	return {
		'x-dead-letter-exchange': 'dead.letter.exchange',
		'x-dead-letter-routing-key': 'retry.fixed.delay'
	};
}

exports._initQueue = (channel, queue) => {
	let dl_args = _initDLX(channel);

	channel.assertQueue(queue, {
		durable: true,
		autoDelete: true,
		arguments: {
			...dl_args,
		}
	});
}

//////////////////////////////////////////////////

// ASYNC VERSION by @author: TRAN PHUC

/**
 * 
 * @param {fn} cb 
 */
exports.initChannel = async (cb) => {
	try {
		const conn =  await asyncAmqp.connect(process.env.AMQP_URL);
		const channel = await conn.createChannel();
	
		channel.prefetch(1);
	
		cb(channel);
	} catch (err){
		throw err;
	}
}

/**
 * In case of worker queue, it must align with config on AP
 * Therefore MUST not change
 * 
 * @param {asyncAmqp.Channel} channel 
 * @param {String} queue_name
 * @return {queue}
 */
exports.initQueue = async (channel, queue_name) => {
	if (!queue_name || queue_name == ''){
		return null;
	}

	return await channel.assertQueue(queue_name, {
		durable: true,
		autoDelete: true,
	});
}

/**
 * @param {asyncAmqp.Channel} channel 
 * @param {queue} queue
 */
exports.initRetryEx = async (channel, q) => {
	try {

		const entry_ex = await channel.assertExchange('requeue.exchange', 'direct', {
			durable: true,
			autoDelete: false,
		});
		const retry_ex = await channel.assertExchange('retry.exchange', 'direct', {
			durable: true,
			autoDelete: false,
		});

		const dead_q = await channel.assertQueue(`${q.queue}.dead.letter`, {
			durable: true,
			autoDelete: false
		});
		const retry_q = await channel.assertQueue(`${q.queue}.retry`, {
			durable: true, autoDelete: false,
			arguments: {
				'x-dead-letter-exchange': 'requeue.exchange',
			}
		});

		// bind
		channel.bindQueue(dead_q.queue, retry_ex.exchange, `${q.queue}.retry.fail`);
		channel.bindQueue(retry_q.queue, retry_ex.exchange, q.queue);

		channel.bindQueue(q.queue, entry_ex.exchange, q.queue);

		return retry_ex;

	} catch (err){
		throw err;
	}
	
};

exports.onSuccess = (channel, msg) => {
	console.log(" [x] Done");
	channel.ack(msg);
}

exports.onFailure = async (channel, msg, retry_ex, q) => {
	
	console.log(" [x] Execution fail");
	channel.ack(msg);

	if (!msg.properties.headers){
		msg.properties.headers = {};
	}
	if (!msg.properties.headers['x-retries']){
		msg.properties.headers['x-retries'] = 0;
	}
	
	const retry_count = this.msg.properties.headers['x-retries'];
	const next_delay = (retry_count + 1) * BASIC_RETRY_DELAY;
	
	if (retry_count < MAX_RETRIES){
		// Retry mechanism
		console.log(` [x] Publishing to ${retry_ex.exchange}, routing key ${q.queue} with ${next_delay/1000}s delay`);
		
		const msg_options = {
			expiration: next_delay,
			headers: {
				'x-retries': retry_count + 1,
				'retry-reason': reason
			}
		};
		channel.publish(retry_ex.exchange, q.queue, Buffer.from(this.msg.content), msg_options);
	} else {
		// send to dead letter queue
		console.log(` [x] Worker fail processing task`)
		console.log(` [x] Retry exceed limit (${MAX_RETRIES}). Message sent to '${q.queue}.dead.letter'!`);
		
		const msg_options = {
			headers: {
				'retry-reason': reason
			}
		};
		channel.publish(retry_ex.exchange, `${q.queue}.retry.fail`, Buffer.from(this.msg.content), msg_options);
	}
}
