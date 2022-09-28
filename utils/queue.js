
require('dotenv').config({path:require("path").dirname(__dirname)+`/.env`});

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


exports.initAsyncChannel = async (cb) => {
	try {
		const conn =  await asyncAmqp.connect(process.env.AMQP_URL);
		const channel = await conn.createChannel();
	
		cb(channel);
	} catch (err){
		throw err;
	}
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

exports.initQueue = (channel, queue) => {
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

/**
 * 
 * @param {asyncAmqp.Channel} channel 
 * @return {Object} exchange & queue for pubsub trial
 */
exports.initPubsubRetryEx = async channel => {
	try {
		const dead_letter_queue = await channel.assertQueue('dead.letter.queue', {durable: false});

		const retry_ex = await channel.assertExchange('retry.pubsub.exchange', 'direct', {durable: false});
		const resend_ex = await channel.assertExchange('resend.pubsub.exchange', 'direct', {durable: false});
		const retry_q = await channel.assertQueue('retry.pubsub.queue', {
			durable: false,
			arguments: {
				'x-dead-letter-exchange': resend_ex.exchange,
			}
		});

		channel.bindQueue(dead_letter_queue.queue, retry_ex.exchange, 'dead');

		return {
			retry_ex: retry_ex.exchange,
			retry_q: retry_q.queue,
			resend_ex: resend_ex.exchange
		}
	} catch (err){
		throw err;
	}
}


/**
 * 
 * @param {asyncAmqp.Channel} channel 
 */
exports.initRetryEx = async (channel, queue) => {
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
				'x-dead-letter-routing-key': queue.queue
			}
		});

		// bind
		channel.bindQueue(dead_queue.queue, retry_ex.exchange, 'retry.fail');

		return {
			retry_ex,
			dead_queue,
			retry_q
		}

	} catch (err){
		throw err;
	}
	
}