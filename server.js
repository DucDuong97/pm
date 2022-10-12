
const { startWorkers, restartWorkers, stopWorker, deleteWorker, getWorkersList, getWorkerData } = require('./pm-control.js');
const { app_worker_config } = require('./platform.js');
const { initEntryEx, deleteEntryEx } = require('./utils/pubsub');
const { initChannel } = require('./utils/queue');

require('dotenv').config({path:`${__dirname}/.env${process.env.NODE_ENV == 'development' ? '':'.local'}`});

const app = require("express")();

app.use(require("body-parser").urlencoded({ extended: false }));

app.get("/url", (req, res) => {
	res.json(["support http"]);
});

app.post("/start-worker", (req, res) => {

	let app_name = req.body.app_name;
	let worker   = req.body.worker_name;
	let amount   = req.body.amount;
	let type     = req.body.type;
	let mode     = req.body.mode;
	let topic     = req.body.topic;

	console.log(`Start worker: ${app_name}.${worker}`);
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
});

app.post("/restart-worker", (req, res) => {

	let app_name = req.body.app_name;
	let worker   = req.body.worker_name;

	let result = {};

	restartWorkers(`${app_name}.${worker}`, (err, apps) => {
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

app.post("/stop-worker", (req, res) => {

	let app_name = req.query.app_name;
	let worker   = req.query.worker_name;

	let result = {};

	stopWorker(app_name + '.' + worker, (err, apps) => {
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

	let app_name = req.query.app_name;
	let worker   = req.query.worker_name;

	let result = {};

	deleteWorker(app_name + '.' + worker, (err, apps) => {
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
	console.log("Describe worker...");

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

app.get("/list", (req, res) => {
	getWorkersList((err,list) => res.json(list));
});


app.listen(process.env.PORT, () => {
	console.log("Server running on port " + process.env.PORT);
});