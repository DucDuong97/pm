
require('dotenv').config({path:require("path").dirname(__dirname)+`/.env${process.env.NODE_ENV == 'development' ? '':'.local'}`});

const asyncAmqp = require('amqplib');

//////////////////////////////////////////////////

// ASYNC VERSION by @author: TRAN PHUC

/**
 * 
 * @param {asyncAmqp.Channel} channel 
 * @param {String} ex_name 
 * @param {String} type 
 * @returns 
 */
exports.initEntryEx = async (channel, topic) => {
	return await channel.assertExchange(topic, 'fanout', {
		durable: true
	});
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
exports.initTempQueue = async (channel) => {
    return await channel.assertQueue('', {
        durable: true,
        exclusive: true
    })
}


// PUBSUB

/**
 * 
 * @param {asyncAmqp.Channel} channel 
 * @return {Object} exchange & queue for pubsub trial
 */
exports.initRetryEx = async (channel, entry_ex, q) => {
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