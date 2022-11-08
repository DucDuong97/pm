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
    
    
    
}

module.exports = execute;