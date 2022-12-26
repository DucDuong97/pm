
const root = require("app-root-path") + "/src";

const broker_client = require(`${root}/brokers/rabbitmq/manager`).client({
    host: process.env.RBMQ_HOST,
    port: `1${process.env.RBMQ_PORT}`,
    user: process.env.RBMQ_USER,
    password: process.env.RBMQ_PASSWD,
});

const express = require("express");

const router = express.Router();

router.route('/create').post(async (req, res) => {

	console.log("Creating topic...");

	let app   = req.body.app_name;
	let topic = req.body.topic_name;
	let type  = req.body.topic_type;

    if (!type){
        type = 'fanout';
    }

	console.log("type:", type);

    broker_client.createExchange({
        vhost: app,
        exchange: `topic.${app}.${topic}`,
        type: type,
        durable: true,
    }, (err, obj) => {
        const result = {};
        if (err){
            console.log(err);
            result.success = false;
        } else {
            console.log(`Creating topic topic.${app}.${topic} successfully!`);
            result.success = true;
        }
        res.json(result);
    });
});

router.route('/delete').post(async (req, res) => {

	console.log("Deleting topic...");

	let app   = req.body.app_name;
	let topic = req.body.topic_name;

    broker_client.deleteExchange({
        vhost: app,
        exchange: '',
    }, (err, obj) => {
        const result = {};
        if (err){
            console.logs(err);
            result.success = false;
        } else {
            console.log(`Deleting topic topic.${app}.${topic} successfully!`);
            result.success = true;
        }
        res.json(result);
    });
});

router.route('/list').get(async (req, res) => {

	console.log("Listing topics...");

    broker_client.listExchanges({
        vhost: '',
    }, (err, obj) => {
        const result = {};
        if (err){
            console.log(err);
            result.success = false;
        } else {
            result.success = true;
            result.topics = obj;
        }
        res.json(result);
    });
});

router.route('/dummy').get(async (req, res) => {

});

module.exports = router;