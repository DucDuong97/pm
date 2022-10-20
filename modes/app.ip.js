
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
    console.log(`https://${job_context.hostname}/${job_context.app}/.queue/${job_context.worker}`);

    var bodyFormData = new FormData();
    bodyFormData.append('__utoken', process.env.EXTERNAL_TOKEN);
    bodyFormData.append('data', job_context.msg);


    var hostile = require('hostile')
    hostile.set(job_context.ip, job_context.hostname);

    axios({
        method: 'post',
        url: `https://${job_context.hostname}/${job_context.app}/.queue/${job_context.worker}`,
        data: bodyFormData,
        httpsAgent: httpsAgent,
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
        hostile.remove(job_context.ip, job_context.hostname, function (err) {
            if (err) {
              console.error(err)
            } else {
              console.log('remove /etc/hosts successfully!')
            }
          });
        finalCb();
    })
    .catch(err => {
        console.log("[x] Connection error");
        errCb(err);
        failCb();
        hostile.remove(job_context.ip, job_context.hostname, function (err) {
            if (err) {
              console.error(err)
            } else {
              console.log('remove /etc/hosts successfully!')
            }
          });
        finalCb();
    });
};

module.exports = execute;