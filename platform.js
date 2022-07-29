const dotenv = require('dotenv');
dotenv.config();

const fs = require('fs');

const workers = fs.readFileSync(process.env.SUCCESS_ROOT+'/workers.json');

exports.app_workers_config = (app_name) => {
    app_wokers = workers.apps[app_name];
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