
require('dotenv').config({path:require("path").dirname(__dirname)+`/.env${process.env.NODE_ENV == 'development' ? '':'.local'}`});

const axios = require('axios');
const https = require('https');
const fs = require('fs');
var FormData = require('form-data');

const httpsAgent = new https.Agent({
	rejectUnauthorized: false, // (NOTE: this will disable client verification)
	cert: fs.readFileSync(require("path").dirname(__dirname)+"/cert/success.crt"),
	key:  fs.readFileSync(require("path").dirname(__dirname)+"/cert/success.key"),
	passphrase: "YYY"
})

const execute = function(job_context, dataCb, errCb, succCb, failCb, finalCb){
    console.log('Sending external HTTP...');

    var bodyFormData = new FormData();
    bodyFormData.append('__utoken', process.env.EXTERNAL_TOKEN);
    bodyFormData.append('data', job_context.msg);

    console.log(`http://${job_context.address}/.queue/${job_context.worker}`);

    axios({
        method: 'post',
        url: `http://${job_context.address}/.queue/${job_context.worker}`,
        data: bodyFormData,
        // httpsAgent: httpsAgent,
    })
    .then(res => {
        const data = res.data;
        console.log('Data: ', data);
        dataCb(data.data);
        if (data && data.code == 1){
            succCb();
        }
        if (!data || data.code != 1){
            failCb();
        }
        finalCb();
    })
    .catch(err => {
        console.log("[x] Connection error");
        errCb(err);
        failCb();
        finalCb();
    });
};

module.exports = execute;