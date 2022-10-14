
const asyncAmqp = require('amqplib');

//////////////////////////////////////////////////

// ASYNC VERSION by @author: TRAN PHUC

/**
 * 
 * @param {asyncAmqp.Channel} channel 
 * @param {String} ex_name 
 * @returns 
 */
exports.initEntryEx = async (channel, topic) => {
	return await channel.assertExchange(topic, 'fanout', {
		durable: true,
		autoDelete: false,
	});
}

/**
 * 
 * @param {asyncAmqp.Channel} channel 
 * @param {String} ex_name
 * @returns 
 */
exports.deleteEntryEx = (channel, topic, cb) => {
	channel.deleteExchange(topic, cb);
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
exports.initTempQueue = async (channel, entry_ex) => {
    const q = await channel.assertQueue('', {
        durable: true,
        exclusive: true
    });
	
	channel.bindQueue(q.queue, entry_ex.exchange, '');

	return q;
}


// PUBSUB

/**
 * 
 * @param {asyncAmqp.Channel} channel 
 * @return {Object} exchange & queue for pubsub trial
 */
exports.initRetryEx = async (channel, queue) => {
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
		channel.bindQueue(queue, resend_ex.exchange, queue);
		channel.bindQueue(retry_q.queue, retry_ex.exchange, queue);

		return {
			retry_ex,
			retry_q,
			resend_ex
		}
	} catch (err){
		throw err;
	}
}