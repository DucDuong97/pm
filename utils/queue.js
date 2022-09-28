
require('dotenv').config({path:require("path").dirname(__dirname)+`/.env${process.env.NODE_ENV == 'development' ? '':'.local'}`});

const amqp = require('amqplib/callback_api');

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