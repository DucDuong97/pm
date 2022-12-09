
const asyncAmqp = require('amqplib');
const Queue = require('./queue');

//////////////////////////////////////////////////

class Pubsub extends Queue {

	/**
	 * 
	 * @param {String} topic 
	 * @param {String} type 
	 * @returns {asyncAmqp.Replies.AssertExchange}
	 */
	static async initEntryEx(topic, type) {
		this._initChannel();

		if (typeof type == 'undefined'){
			type = 'fanout';
		}
		if (type == 'routing'){
			type = 'topic';
		} else{
			type = 'fanout';
		}
		return await this._chan.assertExchange(topic, type, {
			durable: true
		});
	}
	
	/**
	 * @param {String} topic
	 */
	static deleteEntryEx(topic, cb) {
		this._initChannel();
		this._chan.deleteExchange(topic, cb);
	}
	
	static async build(topic, type, cb){

		const channel = await this._initChannel();

		/**
		 * init Topic
		 */
		if (!topic || topic == ''){
			console.log("Invalid topic name");
			process.exit();
		}
		this.topic = (await this.initEntryEx(channel, topic, type)).exchange;

		/**
		 * init Temp Queue
		 */
		const q = await channel.assertQueue('', {
			durable: true,
			exclusive: true,
		});
		channel.bindQueue(q.queue, this.topic, '');

		/**
		 * retry mechanism
		 */
		const {retry_key, dead_key, exceed_key} = this.initRetryMechanism("pubsub");

		cb(new Queue({

			channel, 
			
			queue: q.queue,
			
			retry_key, dead_key, exceed_key,
		}));
	}
}

module.exports = Pubsub;