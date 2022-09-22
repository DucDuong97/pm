const dotenv = require('dotenv');
dotenv.config();

exports.app_worker_config = (app_name, worker_name, amount, type, mode) => {

    if (type == 'pubsub'){
        var script = 'pubsub';
    } else {
        var script = 'work';
    }

    var mode_ext = '';

    if (mode == 'http'){
        mode_ext = '.http'
    }

    console.log(script);
    return {
        name: `${app_name}.${worker_name}`,
        namespace: app_name,
        script: `workers/${script}.queue${mode_ext}.js`,
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