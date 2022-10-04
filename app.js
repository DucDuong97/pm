
require('dotenv').config({path:require("path").dirname(__dirname)+`/.env${process.env.NODE_ENV == 'development' ? '':'.local'}`});

const { startWorkers } = require('./pm-control.js');
const { app_worker_config } = require('./platform.js');

console.log('~');
console.log('Deploying work queue...');

/**
 * Default
 */
var mode = 'http';

/**
 * Handle input arguments
 */
var args = process.argv.slice(2);

if (!args[0] && !args[1]){

}

var app = args[0];
var worker = args[1];
if (args[2]) {
    mode = args[2];
}
if (mode == 'http') {
    console.log(`Target HTTP URL: ${process.env.HTTP_URL}`);
}else{
    console.log(`Success root: ${process.env.SUCCESS_ROOT}`);
}
console.log('~');

startWorkers(app_worker_config(app, worker, 1, 'worker', mode), (err, apps) => {
    if (err) {
        console.log('[-] ERROR: Cannot start worker. Please contact the Maintainer.');
    } else {
        console.log('[+] Worker is running. Execute the following command to inspect:');
        console.log('---- pm2 monit ----');
        console.log('[*] To shutdown the workers, execute the following command:');
        console.log('---- pm2 delete all ----');
        console.log('~');
        console.log(`[*] The queue name is: worker.${app}.${worker}`);
    }
});