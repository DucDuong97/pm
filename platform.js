const dotenv = require('dotenv');
dotenv.config();

// exports.app_worker_config = (app_name, worker_name, amount) => {

//     return {
//         name: `${app_name}.${worker_name}`,
//         namespace: app_name,
//         script: `workers/work.queue.php`,
//         interpreter: "php",
//         args: `--app ${app_name} --worker ${worker_name}`,
//         instances: amount,
//         //TODO max_memory_restart: '300M'   -- to be considered,
//     };
// };

exports.app_worker_config = (app_name, worker_name, amount, type) => {
    console.log(type);
    if (type == 'pubsub'){
        var script = 'pubsub';
        console.log('hier1');
    } else {
        var script = 'work';
        console.log('hier2');
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