const dotenv = require('dotenv');
dotenv.config();

const fs = require('fs');

const workers = JSON.parse(fs.readFileSync(process.env.SUCCESS_ROOT+'/workers.json'));
console.log('reading worker config at:', process.env.SUCCESS_ROOT+'/workers.json');
console.log('worker config:', workers);

exports.app_worker_config = (app_name, worker_name) => {
    app_workers = workers.apps[app_name];
    if (app_workers === undefined) {
        return [];
    }
    return app_workers
        .filter(config => {
            return config.name == worker_name;
        })
        .map(config => ({
            name: `${app_name}.${config.name}`,
            namespace: app_name,
            script: `${process.env.SUCCESS_ROOT}/${app_name}/platform/${config.type}/${config.name}.php`,
            interpreter: "php",
            instances: config.amount
        }));
};

exports.app_workers_config = (app_name) => {
    app_workers = workers.apps[app_name];
    if (app_workers === undefined) {
        return [];
    }
    return app_workers.map(config => ({
        name: `${app_name}.${config.name}`,
        namespace: app_name,
        script: `${process.env.SUCCESS_ROOT}/${app_name}/platform/${config.type}/${config.name}.php`,
        interpreter: "php",
        instances: config.amount
    }));
};

exports.app_workers_name = (app_name) => {
    app_wokers = workers.apps[app_name];
    return app_workers.map(config => `${app_name}.${config.name}`);
};