
const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
var FormData = require('form-data');

const cert_dir = path.dirname(path.dirname(__dirname))+"/cert";

const httpsAgent = new https.Agent({
	rejectUnauthorized: false, // (NOTE: this will disable client verification)
	cert: fs.readFileSync(cert_dir+"/success.crt"),
	key:  fs.readFileSync(cert_dir+"/success.key"),
	passphrase: "YYY"
})

const execute = function(job_context, dataCb, errCb, succCb, failCb, finalCb){
    console.log('Sending HTTP: '+`https://${process.env.HTTP_URL}/${job_context.app}/.queue/${job_context.worker}`);

    var bodyFormData = new FormData();
    bodyFormData.append('__utoken', process.env.UTOKEN);
    bodyFormData.append('data', job_context.msg);

    axios({
        method: 'post',
        url: `https://${process.env.HTTP_URL}/${job_context.app}/.queue/${job_context.worker}`,
        data: bodyFormData,
        httpsAgent: httpsAgent,
    })
    .then(res => {
        const data = res.data;
        console.log('Data: ', data);

        if (typeof data === 'str'){
            console.log("[x] Uncaught error");
            errCb(data);
            failCb();
            finalCb();
            return;
        }

        dataCb(data.data);
        if (data && data.code == 1){
            if (data.message == "error.retriable"){
                failCb();
            } else {
                succCb();
            }
        }
        if (!data || data.code != 1){
            console.log("[x] Uncaught error");
            errCb(data.message);
            succCb();
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