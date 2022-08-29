const dotenv = require('dotenv');
dotenv.config();

exports.app_worker_config = (app_name, worker_name, amount) => {

    return {
        name: `${app_name}.${worker_name}`,
        namespace: app_name,
        script: `workers/queue.worker.php`,
        interpreter: "php",
        args: `--app ${app_name} --worker ${worker_name}`,
        instances: amount,
        //TODO max_memory_restart: '300M'   -- to be considered,
    };
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