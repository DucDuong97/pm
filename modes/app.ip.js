
const axios = require('axios');
const https = require('https');
const fs = require('fs');
const FormData = require('form-data');

const httpsAgent = new https.Agent({
	rejectUnauthorized: false, // (NOTE: this will disable client verification)
	cert: fs.readFileSync(require("path").dirname(__dirname)+"/cert/success.crt"),
	key:  fs.readFileSync(require("path").dirname(__dirname)+"/cert/success.key"),
	passphrase: "YYY"
})

const execute = async function(job_context, dataCb, errCb, succCb, failCb, finalCb){
    console.log('Sending external HTTPP...');
    console.log(`https://${job_context.hostname}/${job_context.app}/.queue/${job_context.worker}`);

    let bodyFormData = new FormData();
    bodyFormData.append('__utoken', process.env.EXTERNAL_TOKEN);
    bodyFormData.append('data', job_context.msg);

    try {
        await setHost(job_context.hostname, job_context.ip, 'set');
    } catch(err){
        console.log(`Cannot set IP ${job_context.ip} for host ${job_context.hostname}`);
    }

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
        
        setHost(job_context.hostname, job_context.ip, 'remove');
    })
    .catch(err => {
        console.log("[x] Connection error");
        errCb(err);
        failCb();
    });
};

const setHost = async (hostname, ip, action) => {
    let bodyFormData = new FormData();
    bodyFormData.append('ip', ip);
    bodyFormData.append('hostname', hostname);
    bodyFormData.append('action', action);

    return await axios.post(`http://localhost:3000/modify-host`,{
        ip: ip,
        hostname: hostname,
        action: action
    });
};

module.exports = execute;