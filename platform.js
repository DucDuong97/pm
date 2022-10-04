
require('dotenv').config({path:`${__dirname}/.env${process.env.NODE_ENV == 'development' ? '':'.local'}`});

exports.app_worker_config = (app_name, worker_name, amount, type, mode) => {
    
    // if (!process.env.SUCCESS_ROOT){
    //     console.log('[INFO] app and worker checking is disabled');
    // }else{

    // }

    if (type == 'pubsub'){
        var script = 'pubsub';
    } else {
        var script = 'queue';
    }

    var mode_ext = 'basic';

    if (mode == 'http'){
        mode_ext = 'http'
    }

    return {
        name: `${app_name}.${worker_name}`,
        namespace: app_name,
        script: `workers/${mode_ext}/${script}.worker.js`,
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