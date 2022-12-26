
const root = require("app-root-path") + "/src";
const ProcessManager = require(`${root}/utils/pm`);
const { app_worker_config, service_worker_config, ip_worker_config } = require(`${root}/platform.js`);

const express = require("express");

const router = express.Router();

router.route('/start').post(async (req, res) => {

	let app_name	= req.body.app_name;

	let worker		= req.body.worker_name;
	let amount		= req.body.amount;

	let type		= req.body.type;
	let topic		= req.body.topic;

	let mode		= req.body.mode;

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

router.route('/restart').post(async (req, res) => {

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

router.route('/stop').post(async (req, res) => {

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

router.route('/delete').post(async (req, res) => {

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

router.route('/logs/:worker_name').get(async (req, res) => {

	let worker   = req.params.worker_name;
	console.log(`Worker logs: ${worker} ...`);

	let result = '';

	const { spawn } = require('child_process');
	const child = spawn('pm2', [
		'logs', '--lines', '100', '--nostream', worker
	]);
    child.stdout.on('data', (data) => {
        result += data;
    });
    child.stderr.on('data', (data) => {
        console.log(`ERROR...`);
        console.log(data);
    });
	child.on('exit', function (code, signal) {
        
        // if exit code == 0 (means script ends without errors) ack
        if (code == 0){
			console.log('Send logs to Client....');
            res.json({
				success: true,
				data: result
			});
			return;
        }
        console.log('Exit: child process exited with ' +
                `code ${code} and signal ${signal}`);
		res.json({
			success: false,
		});
    });
	child.on('error', (err) => {
		console.error(`Backend error: ${err}`);
	})
});

router.route('/describe/:worker_name').get(async (req, res) => {

	console.log(`Describe worker: ${req.params.worker_name} ...`);

	let result = {};

	ProcessManager.getWorkerData(req.params.worker_name, (err, worker) => {
		if (err) {
			result.ok = false;
			result.err_msg = err;
		} else {
			result.ok = true;
			result.amount = worker.length;
			result.worker = worker;
		}
		res.json(result);
	});
});

router.route('/dummy').get(async (req, res) => {

});

module.exports = router;