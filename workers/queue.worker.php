<?php 

	/**
	 * @desc Installing work queue
	 */

	$dir = 'C:/xampp/htdocs/trueroot/success'; // SUCCESS DIR ~ C:/xampp/htdocs/success
	require_once dirname($dir)."/true/ap/webroot/service.php";
	
	$longopts = array("app:", "worker:", "nosql");
	$vals = getopt(null, $longopts);
	
	$app = $vals["app"];
	
	if (isset($vals['worker'])){
		$worker = $vals["worker"];
		
		$r = new \root\Service($dir);
		$r->build($app, [
			"sql"=> isset($vals["nosql"])?0:1
		]);
		
		$r->work($worker);
	}else{
		$r = new \root\Service($dir);
		$r->build($app, [
			"sql"=> isset($vals["nosql"])?0:1
		]);
		
		$r->wait();
	}
	
?>