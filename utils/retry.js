class RetryUtils {
	//

	constructor(msg){

		if (!msg.properties.headers){
			msg.properties.headers = {};
		}
		if (!msg.properties.headers['x-retries']){
			msg.properties.headers['x-retries'] = 0;
		}
		if (!msg.properties.headers['basic-retry-delay']){
			msg.properties.headers['basic-retry-delay'] = process.env.BASIC_RETRY_DELAY || 3000;
		}

		this.msg = msg;
	}

	//

	getRetryCount(){
		return this.msg.properties.headers['x-retries'];
	}

	//

	getBasicRetryCount(){
		return this.msg.properties.headers['basic-retry-delay'];
	}

	//

	getNextRetryDelay(){
		let retry_count = this.getRetryCount();
		return ++retry_count * this.msg.properties.headers['basic-retry-delay'];
	}

	//

	getRetryOptions(){

		let retry_count = this.getRetryCount();

		return {
			expiration: this.getNextRetryDelay(),
			headers: {
				'x-retries': ++retry_count,
				'basic-retry-delay': this.msg.properties.headers['basic-retry-delay']
			}
		}
	}

	//

	retry(channel, retry_ex, q){
		const retry_delay = this.getNextRetryDelay();
		const retry_count = this.getRetryCount();
		
		if (retry_count < 3){
			// Retry mechanism
			console.log(` [x] Publishing to retry exchange with ${retry_delay/1000}s delay`);
			
			// send to retry queue
			console.log(` [x] Message will be sent back to exchange: ${retry_ex.exchange}`)
			
			const msg_options = this.getRetryOptions();
			channel.publish(retry_ex.exchange, q.queue, Buffer.from(this.msg.content.toString()), msg_options);
		} else {
			// send to dead letter queue
			// TODO: consider what information of message to publish to dead letter queue
			console.log(` [x] Worker fail processing task`)
			console.log(` [x] Retry exceed limit (3). Message will be sent to dead letter queue!`);
			channel.publish(retry_ex.exchange, 'retry.fail', Buffer.from(JSON.stringify(this.msg)));
		}
	}
}

module.exports = RetryUtils;