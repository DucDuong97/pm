const { spawn } = require('child_process');

const execute = (job_context, stdoutCb, stderrCb, successCb, failureCb, finishCb)=>{
    console.log('Spawning...');
    const child = spawn(
        'php', [
            process.env.SUCCESS_ROOT+'/bin/work.resolve.php',
            '--app', job_context.app,
            '--worker', job_context.worker,
            '--msg', job_context.msg,
        ],
    );
    
    child.stdout.on('data', (data) => {
        stdoutCb(data);
    });
    
    child.stderr.on('data', (data) => {
        stderrCb(data);
    });
    
    child.on('exit', function (code, signal) {
        console.log('Exit: child process exited with ' +
                `code ${code} and signal ${signal}`);
        
        // if exit code == 0 (means script ends without errors) ack
        if (code == 0){
            successCb();
        }
    
        // if exit code != 0 (means script ends due to PHP uncaught errors) to DLX
        if (code != 0){
            failureCb();
        }

        finishCb();
    });
}

module.exports = execute;