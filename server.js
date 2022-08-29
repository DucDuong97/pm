
const { startWorkers, stopWorker, getWorkersList, getWorkerData } = require('./pm-control.js');
const { app_worker_config, app_workers_config } = require('./platform.js');

require('dotenv').config({path:__dirname+`/.env`});

const app = require("express")();

app.use(require("body-parser").urlencoded({ extended: false }));

app.get("/url", (req, res, next) => {
    res.json(["Tony","Lisa","Michael","Ginger","Food"]);
});

app.post("/start-worker", (req, res, next) => {
    console.log(req.body);
    let app_name = req.body.app_name;
    let worker_name = req.body.worker_name;
    let amount = req.body.amount;

    let result = {};

    startWorkers(app_worker_config(app_name, worker_name, amount), (err, apps) => {
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

app.post("/stop-worker", (req, res, next) => {
    let app_name = req.query.app_name;
    let worker_name = req.query.worker_name;

    let result = {};

    stopWorker(app_name + '.' + worker_name, (err, apps) => {
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

app.get("/describe-worker/:worker_name", (req, res, next) => {
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

app.get("/list", (req, res, next) => {
    getWorkersList((err,list) => res.json(list));
});


app.listen(process.env.PORT, () => {
    console.log("Server running on port 3000");
});