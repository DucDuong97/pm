const pm2 = require('pm2');

exports.startWorkers = (configs, errback) => {
    pm2.connect(function(err){
        if (err) {
            console.error(`connection error: ${err}`);
            process.exit(2);
        }
    
        pm2.start(configs, function(err, apps){
            if (err) {
                console.error(`start error: ${err}`);
            }
            errback(err, apps);
            pm2.disconnect();
        });
    });
};

exports.getWorkersList = (errback) => {
    pm2.connect(function(err){
        if (err) {
            console.error(`connection error: ${err}`);
            process.exit(2);
        }
    
        pm2.list((err, list) => {
            errback(err, list);
            pm2.disconnect();
        });
    });
};

exports.getWorkerData = (worker_name, errback) => {
    pm2.connect(function(err){
        if (err) {
            console.error(`connection error: ${err}`);
            process.exit(2);
        }
    
        pm2.describe(worker_name, (err, worker) => {
            errback(err, worker);
            pm2.disconnect();
        });
    });
};