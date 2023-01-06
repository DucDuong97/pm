
/**
 * Load environment
 */
 require('dotenv').config();

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

app.use("/worker", require("./routes/worker"));
app.use("/topic", require("./routes/topic"));
// app.use("/app", require("./routes/app"));

app.get("/queue/:app/:queue", (req, res) => {
	console.log("Describe queue " + req.params.queue + " in app " + req.params.app);

	const broker_client = require(`./brokers/rabbitmq/manager`).client(req.params.app);

	broker_client.getQueue({
		vhost:req.params.app,
		queue:req.params.queue,
	}, (err, data) => {
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