
const { startWorkers, restartWorkers, stopWorker, deleteWorker, getWorkerData } = require('./pm-control.js');
const { app_worker_config, service_worker_config, ip_worker_config } = require('./platform.js');
const { initEntryEx, deleteEntryEx } = require('./queue/pubsub');
const { initChannel } = require('./queue/queue');

require('./utils/load.env');

const app = require("express")();

app.use(require("body-parser").urlencoded({ extended: true }));
app.use(require("body-parser").json());

app.get("/url", (req, res) => {
	res.json(["heelo world"]);
});

app.post("/start-worker", (req, res) => {

	let app_name = req.body.app_name;
	let service_name = req.body.service_name;

	let worker   = req.body.worker_name;
	let amount   = req.body.amount;

	let type     = req.body.type;
	let topic    = req.body.topic;

	let mode     = req.body.mode;
	let ip     = req.body.ip;
	let hostname     = req.body.hostname;

	console.log("type ", type);

	if (type.startsWith('ip.')){
		console.log(`Starting IP worker: ${service_name}.${worker} ...`);
		console.log(`With type: ${type}`);
		console.log(`With mode: ${mode}`);
	
		let result = {};

		type = type.replace("ip.", "");
	
		startWorkers(ip_worker_config(app_name, worker, amount, type, mode, ip, hostname, topic), (err, apps) => {
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
		console.log(`Starting service worker: ${service_name}.${worker} ...`);
		console.log(`With type: ${type}`);
		console.log(`With mode: ${mode}`);
	
		let result = {};

		type = type.replace("external.", "");
	
		startWorkers(service_worker_config(service_name, worker, amount, type, mode, address, topic), (err, apps) => {
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
	
		startWorkers(app_worker_config(app_name, worker, amount, type, mode, topic), (err, apps) => {
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

	restartWorkers(worker, (err, apps) => {
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
		'list',
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

	stopWorker(worker, (err, apps) => {
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

	deleteWorker(worker, (err, apps) => {
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

	let app = req.body.app_name;
	let topic   = req.body.topic_name;

	initChannel(async (channel) => {
		let result = {};

		initEntryEx(channel, `topic.${app}.${topic}`);

		if (false) {
			result.success = false;
			result.err_msg = err;
		} else {
			result.success = true;
		}

		res.json(result);
	});
});

app.post("/delete-topic", (req, res) => {
	console.log("Deleting topic...");

	let app = req.body.app_name;
	let topic   = req.body.topic_name;
	
	initChannel(async (channel) => {
		let result = {};

		deleteEntryEx(channel, `topic.${app}.${topic}`);
		
		if (false) {
			result.success = false;
			result.err_msg = err;
		} else {
			result.success = true;
		}

		res.json(result);
	});
});

app.get("/describe-worker/:worker_name", (req, res) => {
	console.log(`Describe worker: ${req.params.worker_name} ...`);

	let result = {};

	getWorkerData(req.params.worker_name, (err, worker) => {
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


app.listen(process.env.PORT, () => {
	console.log("Server running on port " + process.env.PORT);
});