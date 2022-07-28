
var { startWorkers, getWorkersList, getWorkerData } = require('./pm-control.js');
var { app_ecosystem, app_workers } = require('./platform.js');

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

app.post("/start-workers", (req, res, next) => {
    let app_name = req.body.app_name;

    let result = {};
    result.success = startWorkers(app_ecosystem(app_name));
    
    res.json(result);
});

app.get("/describe-worker", (req, res, next) => {
    getWorkerData(
        req.query.service,
        (data) => res.json(data),
        (err) => res.json({message: "worker does not exist"})
    );
});

app.get("/describe-workers/app", (req, res, next) => {
    
    getWorkerData(
        req.query.app,
        (data) => res.json(data),
        (err) => res.json({message: "worker does not exist"})
    );
});

app.get("/list", (req, res, next) => {
    getWorkersList((list) => res.json(list));
});

