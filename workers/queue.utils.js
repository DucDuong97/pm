
require('dotenv').config({path:require("path").dirname(__dirname)+`/.env`});

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

exports.initDLX = (channel) => {
    
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
					channel.bindQueue(q.queue, ex.exchange, 'asd');
				}
			);
		}
	);

	return {
		'x-dead-letter-exchange': 'dead.letter.exchange',
		'x-dead-letter-routing-key': 'asd'
	};
}