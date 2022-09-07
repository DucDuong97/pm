<?php

	// Producer #1
	require 'C:\xampp\htdocs\trueroot\extlib\rabbitmq\autoload.php';

	$connection = new \PhpAmqpLib\Connection\AMQPStreamConnection(
        'localhost', 5672, 'guest', 'guest');
	$channel = $connection->channel();

	$channel->queue_declare('hello', false, false, false, false);

	$msg = new PhpAmqpLib\Message\AMQPMessage('Hello World! '.time());
	$channel->basic_publish($msg, '', 'hello');

	echo " [x] Sent 'Hello World!'\n";
    
    $channel->close();
    $connection->close();
?>