
const amqp = require('amqplib/callback_api');
const asyncAmqp = require('amqplib');

const RetryUtils = require('./retry');

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
 * @param {Boolean} temp - queue is temporary or not 
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
		const entry_ex = await channel.assertExchange('entry.exchange', 'direct', {
			durable: true,
			autoDelete: true,
		});
		
		const retry_ex = await channel.assertExchange('retry.exchange', 'direct', {
			durable: true,
			autoDelete: true,
		});
		const dead_queue = await channel.assertQueue('dead.letter.queue', {
			durable: true,
			autoDelete: false
		});
		const retry_q = await channel.assertQueue('retry.queue', {
			durable: true, autoDelete: false,
			arguments: {
				'x-dead-letter-exchange': 'entry.exchange',
			}
		});

		// bind
		channel.bindQueue(dead_queue.queue, retry_ex.exchange, 'retry.fail');

		channel.bindQueue(q.queue, entry_ex.exchange, q.queue);
		channel.bindQueue(retry_q.queue, retry_ex.exchange, q.queue);

		return {
			retry_ex,
			dead_queue,
			retry_q
		}

	} catch (err){
		throw err;
	}
	
}

exports.onSuccess = (channel, msg) => {
	console.log(" [x] Done");
	channel.ack(msg);
}

exports.onFailure = async (channel, msg, retry_ex, queue) => {
	
	const retryUtils = new RetryUtils(msg);
	
	console.log(" [x] Execution fail");
	// ack, worker explicitly send failed msg to retry queue
	channel.ack(msg);
	// retry
	retryUtils.retry(channel, retry_ex, queue);
}
