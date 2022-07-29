const pm2 = require('pm2');
const fs = require('fs');

exports.startWorkers = (configs, num) => {
    if (!fs.existsSync(`./workers/${service_name}.php`)) {
        return false;
    }
    if (!Number.isInteger(num)){
        return false;
    }
    pm2.connect(function(err){
        if (err) {
            console.error(`connection error: ${err}`);
            process.exit(2);
        }
    
        pm2.start(configs, function(err, apps){
            if (err) {
                console.error(`start error: ${err}`);
            }
            console.log(`create ${num} instances of service ${service_name}`);
            pm2.disconnect();
        });
    });
    return true;
};

exports.getWorkersList = (cb) => {
    pm2.connect(function(err){
        if (err) {
            console.error(`connection error: ${err}`);
            process.exit(2);
        }
    
        pm2.list((err, list) => {
            cb(list);
        });
    });
};

exports.getWorkerData = (worker_name, cb, err_cb) => {
    pm2.connect(function(err){
        if (err) {
            console.error(`connection error: ${err}`);
            process.exit(2);
        }
    
        pm2.describe(worker_name, (err, worker) => {
            if (err){
                err_cb(err);
            }
            console.log(worker);
            cb(worker);
        });
    });
};