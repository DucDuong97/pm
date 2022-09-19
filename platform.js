const dotenv = require('dotenv');
dotenv.config();

exports.app_worker_config = (app_name, worker_name, amount, type) => {

    if (type == 'pubsub'){
        var script = 'pubsub';
    } else {
        var script = 'work';
    }

    console.log(script);
    return {
        name: `${app_name}.${worker_name}`,
        namespace: app_name,
        script: `workers/${script}.queue.js`,
        args: `${app_name} ${worker_name}`,
        instances: amount,
        shutdown_with_message: true,
        kill_timeout : 10000
    };
};

exports.app_workers_name = (app_name) => {
    app_wokers = workers.apps[app_name];
    return app_workers.map(config => `${app_name}.${config.name}`);
};