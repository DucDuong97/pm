<?php
	// Consumer #1

	require 'C:\xampp\htdocs\trueroot\extlib\rabbitmq\autoload.php';
	
	$connection = new PhpAmqpLib\Connection\AMQPStreamConnection(
        'localhost', 5672, 'guest', 'guest');
	$channel = $connection->channel();

	$channel->queue_declare('hello', false, false, false, false);

	echo " [*] Waiting for messages. To exit press CTRL+C\n";
	
	$callback = function ($msg){
		echo ' [x] Received ', $msg->body, "\n";
		exit();
	};

	$channel->basic_consume('hello', '', false, true, false, false, $callback);

	while ($channel->is_open()){
		$channel->wait();
	}

    $channel->close();
    $connection->close();
?>