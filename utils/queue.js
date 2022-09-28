
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
 * @param {amqp.Channel} channel 
 * @return {Object} exchange & queue for pubsub trial
 */
exports.initRetryEx = async channel => {
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