
require('dotenv').config({path:require("path").dirname(__dirname)+`/.env${process.env.NODE_ENV == 'development' ? '':'.local'}`});

const amqp = require('amqplib/callback_api');
const asyncAmqp = require('amqplib');

exports.initChannel = (callback) => {	

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


const initDLX = (channel) => {
    
	channel.assertExchange(
		'dead.letter.exchange',
		'direct',
		options = {
			durable: true,
			autoDelete: false,
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
	let dl_args = initDLX(channel);

	channel.assertQueue(queue, {
		durable: true,
		autoDelete: true,
		arguments: {
			...dl_args,
		}
	});
	channel.prefetch(1);
}

//////////////////////////////////////////////////

// ASYNC VERSION by @author: TRAN PHUC


/**
 * 
 * @param {asyncAmqp.Channel} channel 
 * @param {String} ex_name 
 * @param {String} type 
 * @returns 
 */
exports.initEntryEx = async (channel, ex_name, type) => {
	return await channel.assertExchange(ex_name, type, {
		durable: true
	});
}

/**
 * 
 * @param {asyncAmqp.Channel} channel 
 * @param {String} queue_name 
 * @param {Boolean} temp - queue is temporary or not 
 * @return {queue}
 */
exports.initQueue = async (channel, queue_name='', temp = false) => {
	if (temp){
		return await channel.assertQueue(queue_name, {
			durable: true,
			exclusive: true
		})
	}

	return await channel.assertQueue(queue_name, {
		durable: true
	});
}


/**
 * 
 * @param {fn} cb 
 */
exports.initAsyncChannel = async (cb) => {
	try {
		const conn =  await asyncAmqp.connect(process.env.AMQP_URL);
		const channel = await conn.createChannel();
	
		cb(channel);
	} catch (err){
		throw err;
	}
}

// PUBSUB

/**
 * 
 * @param {asyncAmqp.Channel} channel 
 * @return {Object} exchange & queue for pubsub trial
 */
exports.initPubsubRetryEx = async (channel, entry_ex, q) => {
	try {
		const dead_letter_queue = await channel.assertQueue('dead.letter.queue', {durable: true});

		const retry_ex = await channel.assertExchange('retry.pubsub.exchange', 'direct', {durable: true});
		const resend_ex = await channel.assertExchange('resend.pubsub.exchange', 'direct', {durable: true});
		const retry_q = await channel.assertQueue('retry.pubsub.queue', {
			durable: false,
			arguments: {
				'x-dead-letter-exchange': resend_ex.exchange,
			}
		});

		// bind queue
		channel.bindQueue(dead_letter_queue.queue, retry_ex.exchange, 'dead');

		channel.bindQueue(q.queue, entry_ex.exchange, '');
		channel.bindQueue(q.queue, resend_ex.exchange, q.queue);
		channel.bindQueue(retry_q.queue, retry_ex.exchange, q.queue);

		return {
			retry_ex,
			retry_q,
			resend_ex
		}
	} catch (err){
		throw err;
	}
}

// QUEUE

/**
 * @param {asyncAmqp.Channel} channel 
 * @param {queue} queue
 */
exports.initQueueRetryEx = async (channel, entry_ex, q) => {
	try {
		const retry_ex = await channel.assertExchange('retry.exchange', 'direct', {
			durable: true,
			autoDelete: false
		});
		const dead_queue = await channel.assertQueue('dead.letter.queue', {
			durable: true,
			autoDelete: false
		});
		const retry_q = await channel.assertQueue('retry.queue', {
			durable: true, autoDelete: false,
			arguments: {
				'x-dead-letter-exchange': 'entry.exchange',
				'x-dead-letter-routing-key': q.queue
			}
		});

		// bind
		channel.bindQueue(dead_queue.queue, retry_ex.exchange, 'retry.fail');

		channel.bindQueue(q.queue, entry_ex.exchange, 'user.created');
		channel.bindQueue(q.queue, entry_ex.exchange, q.queue);
		channel.bindQueue(retry_q.queue, retry_ex.exchange, 'user.created');
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