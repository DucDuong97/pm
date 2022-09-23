
require('dotenv').config({path:require("path").dirname(__dirname)+`/.env`});

const axios = require('axios');
const https = require('https');
const fs = require('fs');
var FormData = require('form-data');

const httpsAgent = new https.Agent({
	rejectUnauthorized: false, // (NOTE: this will disable client verification)
	cert: fs.readFileSync(require("path").dirname(__dirname)+"/cert/success.crt"),
	key: fs.readFileSync(require("path").dirname(__dirname)+"/cert/success.key"),
	passphrase: "YYY"
})

exports.send = function(app, worker, msg, callback, fallback){
    var bodyFormData = new FormData();
    bodyFormData.append('__utoken', process.env.UTOKEN);
    bodyFormData.append('data', msg);

    axios({
        method: 'post',
        url: `${process.env.HTTP_URL}/${app}/.queue/${worker}`,
        data: bodyFormData,
        httpsAgent: httpsAgent,
    })
    .then(res => {
        callback(res.data);
    })
    .catch(error => {
        fallback(error);
    });
}