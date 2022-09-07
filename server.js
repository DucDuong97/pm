
const { startWorkers, stopWorker, getWorkersList, getWorkerData } = require('./pm-control.js');
const { app_worker_config } = require('./platform.js');

require('dotenv').config({path:__dirname+`/.env`});

const app = require("express")();

app.use(require("body-parser").urlencoded({ extended: false }));

app.get("/url", (req, res) => {
    res.json(["Tony","Lisa","Michael","Ginger","Food"]);
});

app.post("/start-worker", (req, res) => {

    let app_name = req.body.app_name;
    let worker   = req.body.worker_name;
    let amount   = req.body.amount;

    let result = {};

    startWorkers(app_worker_config(app_name, worker, amount), (err, apps) => {
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

app.get("/describe-worker/:worker_name", (req, res) => {

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

app.get("/list", (req, res) => {
    getWorkersList((err,list) => res.json(list));
});


app.listen(process.env.PORT, () => {
    console.log("Server running on port 3000");
});