
var { startWorkers, getWorkersList, getWorkerData } = require('./pm-control.js');
var { app_worker_config, app_workers_config } = require('./platform.js');

const dotenv = require('dotenv');
dotenv.config();

var express = require("express");

var app = express();

app.listen(process.env.PORT, () => {
    console.log("Server running on port 3000");
});

app.get("/url", (req, res, next) => {
    res.json(["Tony","Lisa","Michael","Ginger","Food"]);
});

app.post("/start-worker", (req, res, next) => {
    let app_name = req.query.app_name;
    let worker_name = req.query.app_name;

    let result = {};

    startWorkers(app_worker_config(app_name, worker_name), (err, apps) => {
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

app.post("/start-workers/app/:app_name", (req, res, next) => {
    let app_name = req.params.app_name;

    let result = {};
    result.success = startWorkers(app_workers_config(app_name), (err, apps) => {
        if (err) {
            result.success = false;
            result.err_msg = err;
        } else {
            result.success = true;
            result.apps = apps.map(app => ({
                name: app.pm2_env.name
            }));
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
            // result.worker = worker;
        }

        res.json(result);
    });
});

// app.get("/describe-workers/app/:app_name", (req, res, next) => {
//     getWorkerData(
//         req.params.app_name,
//         (data) => res.json(data),
//         (err) => res.json({message: "worker does not exist"})
//     );
// });

app.get("/list", (req, res, next) => {
    getWorkersList((err,list) => res.json(list));
});

