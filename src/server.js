
/**
 * Load environment
 */
 require('dotenv').config();

/**
 * Load deps
 */
const ProcessManager = require('./utils/pm');
const { app_worker_config, service_worker_config, ip_worker_config } = require('./platform.js');
const Pubsub = require('./brokers/rabbitmq/pubsub');
const Queue = require('./brokers/rabbitmq/queue');

/**
 * Init express server
 */
const app = require("express")();

app.use(require("body-parser").urlencoded({ extended: true }));
app.use(require("body-parser").json());

/**
 * Init request handler
 */
app.get("/ping", (req, res) => {
	res.send("pong");
});

app.post("/start-worker", (req, res) => {

	let app_name		= req.body.app_name;

	let worker   		= req.body.worker_name;
	let amount   		= req.body.amount;

	let type     		= req.body.type;
	let topic    		= req.body.topic;

	let mode     		= req.body.mode;

	if (type.startsWith('ip.')){

		let ip     			= req.body.ip;
		let hostname     	= req.body.hostname;

		console.log(`Starting IP worker: ${app_name}.${worker} ...`);
		console.log(`With type: ${type}`);
		console.log(`With mode: ${mode}`);
	
		let result = {};

		type = type.replace("ip.", "");
	
		ProcessManager.startWorkers(ip_worker_config(app_name, worker, amount, type, mode, ip, hostname, topic), (err, apps) => {
			if (err) {
				result.success = false;
				result.err_msg = err;
			} else {
				result.success = true;
				result.apps = apps;
			}
	
			res.json(result);
		});
	} else if (type.startsWith('external.')){
		let service_name 	= req.body.service_name;

		console.log(`Starting service worker: ${service_name}.${worker} ...`);
		console.log(`With type: ${type}`);
		console.log(`With mode: ${mode}`);
	
		let result = {};

		type = type.replace("external.", "");
	
		ProcessManager.startWorkers(service_worker_config(service_name, worker, amount, type, mode, address, topic), (err, apps) => {
			if (err) {
				result.success = false;
				result.err_msg = err;
			} else {
				result.success = true;
				result.apps = apps;
			}
	
			res.json(result);
		});
	} else{
		console.log(`Starting app worker: ${app_name}.${worker} ...`);
		console.log(`With type: ${type}`);
		console.log(`With mode: ${mode}`);
	
		let result = {};
	
		ProcessManager.startWorkers(app_worker_config(app_name, worker, amount, type, mode, topic), (err, apps) => {
			if (err) {
				result.success = false;
				result.err_msg = err;
			} else {
				result.success = true;
				result.apps = apps;
			}
	
			res.json(result);
		});
	}
});

app.post("/restart-worker", (req, res) => {

	let worker   = req.body.worker_name;
	console.log(`Restarting worker: ${worker} ...`);

	let result = {};

	ProcessManager.restartWorkers(worker, (err, apps) => {
		if (err) {
			result.success = false;
			result.err_msg = err;
		} else {
			result.success = true;
			result.apps = apps;
		}

		res.json(result);
	});
});

app.get("/worker-logs/:worker_name", (req, res) => {

	let worker   = req.params.worker_name;
	console.log(`Worker logs: ${worker} ...`);

	let result = '';

	const { spawn } = require('child_process');
	const child = spawn('pm2', [
		'logs', '--lines', '100', '--nostream', worker
	]);
    child.stdout.on('data', (data) => {
        console.log(`Get logs...`);
        result += data;
    });
    child.stderr.on('data', (data) => {
        console.log(`ERROR...`);
        console.log(data);
    });
	child.on('exit', function (code, signal) {
        console.log('Exit: child process exited with ' +
                `code ${code} and signal ${signal}`);
        
        // if exit code == 0 (means script ends without errors) ack
        if (code == 0){
			console.log('Send logs to Client....');
            res.json({
				success: true,
				data: result
			});
			return;
        }
		res.json({
			success: false,
		});
    });
	child.on('error', (err) => {
		console.error(`Backend error: ${err}`);
	})
});

app.post("/stop-worker", (req, res) => {

	let worker   = req.body.worker_name;
	console.log(`Stopping worker: ${worker} ...`);

	let result = {};

	ProcessManager.stopWorker(worker, (err, apps) => {
		if (err) {
			result.success = false;
			result.err_msg = err;
		} else {
			result.success = true;
			result.apps = apps;
		}
		res.json(result);
	});
});

app.post("/delete-worker", (req, res) => {

	let worker   = req.body.worker_name;
	console.log(`Deleting worker: ${worker} ...`);

	let result = {};

	ProcessManager.deleteWorker(worker, (err, apps) => {
		if (err) {
			result.success = false;
			result.err_msg = err;
		} else {
			result.success = true;
			result.apps = apps;
		}
		res.json(result);
	});
});

app.post("/create-topic", (req, res) => {
	console.log("Creating topic...");

	let app   = req.body.app_name;
	let topic = req.body.topic_name;
	let type  = req.body.topic_type;

	let result = {};
	Pubsub.initEntryEx(`topic.${app}.${topic}`, type);
	result.success = true;
	res.json(result);
});

app.post("/delete-topic", (req, res) => {
	console.log("Deleting topic...");

	let app   = req.body.app_name;
	let topic = req.body.topic_name;

	let result = {};
	
	Pubsub.deleteEntryEx(`topic.${app}.${topic}`);
	console.log(`Deleting topic topic.${app}.${topic} successfully!`);
	result.success = true;
	res.json(result);
});

app.get("/describe-worker/:worker_name", (req, res) => {
	console.log(`Describe worker: ${req.params.worker_name} ...`);

	let result = {};

	ProcessManager.getWorkerData(req.params.worker_name, (err, worker) => {
		if (err) {
			result.found = false;
			result.err_msg = err;
		} else {
			result.found = true;
			result.amount = worker.length;
			result.worker = worker;
		}
		res.json(result);
	});
});

app.get("/describe-topic/:topic_name", (req, res) => {
	console.log(`Describe topic: ${req.params.topic_name} ...`);

	let result = {};

	Pubsub.initChannel(async (channel) => {
		try {
			await channel.checkExchange(req.params.topic_name);
			result.success = true;
			res.json(result);
		} catch(_){

		}
	}, (err) => {
		result.success = false;
		result.err_msg = err;
		res.json(result);
	});
});

app.get("/describe-queue/:queue_name", (req, res) => {
	console.log("Describe queue: " + req.params.queue_name);

	const AMQPStats = require('amqp-stats');
	var stats = new AMQPStats({
		hostname: "localhost:15672",  // default: localhost:55672
	});

	stats.getQueue('/', req.params.queue_name, (err, _, data) => {
		let result = {};

		if (err) {
			console.log(err);
			result.success = false;
			result.err_msg = err;
		} else {
			result.success = true;
			result.data = data;
		}
		
		res.json(result);
	});
});

/**
 * @Deprecated
 */
app.post("/modify-host", (req, res) => {
	
	console.log("Setting host...");

	// NOT FOR PRODUCTION
	if (process.env.NODE_ENV == 'production' || process.env.NODE_ENV == 'staging' ){
		return;
	}

	let ip   = req.body.ip;
	let hostname = req.body.hostname;
	let action = req.body.action;

	console.log(`Host ${hostname}, IP ${ip}`);
		
	const hostile = require('hostile');

	if (action === 'set'){
		var err = hostile.set(ip, hostname);
	
		if (err){
			res.sendStatus(500);
			console.log(err);
			console.log(`Set host failure`);
			return;
		}
	} else {	
		var success = hostile.remove(ip, hostname);
	
		if (!success){
			res.sendStatus(500);
			console.log(err);
			console.log(`Set host failure`);
			return;
		}
	}

	console.log(`Set host Successful`);
	res.sendStatus(200);
});


app.listen(process.env.SERVER_PORT, () => {
	console.log("Server running on port " + process.env.SERVER_PORT);
});