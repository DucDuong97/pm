
const asyncAmqp = require('amqplib');
const Queue = require('./queue');

//////////////////////////////////////////////////

class Pubsub extends Queue {

	/**
	 * 
	 * @param {String} topic 
	 * @param {String} type 
	 * @returns {Promise<asyncAmqp.Replies.AssertExchange>}
	 */
	static async initEntryEx(topic, type) {
		await this._initChannel();

		if (type === 'routing'){
			type = 'topic';
		} else{
			type = 'fanout';
		}
		return this._chan.assertExchange(topic, type, {
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
	
	static async build(vhost, worker, topic, type, cb){

		const channel = await this._initChannel(vhost);

		/**
		 * init Topic
		 */
		if (!topic || topic == ''){
			console.log("Invalid topic name");
			process.exit();
		}
		this.topic = (await this.initEntryEx(topic, type)).exchange;

		const broker_client = require(`./manager`).client(vhost);

		const upstream = topic.split(".")[1];

		if (upstream !== vhost){
			broker_client.createUpstream({
				upstream: upstream,
				exchange: topic,
				vhost: vhost,
			},() => {
				console.log("Federate successful");
			});
		}
		
		const queue = `pubsub.${worker}`;
		const q = await channel.assertQueue(queue, {
			durable: true,
			autoDelete: false,
		});
		channel.bindQueue(q.queue, this.topic, '');

		/**
		 * retry mechanism
		 */
		const {retry_key, dead_key, exceed_key} = await this.initRetryMechanism(q.queue);

		cb(new Queue({
			channel, 
			
			queue: q.queue,
			
			retry_key, dead_key, exceed_key,
		}));
	}
}

module.exports = Pubsub;