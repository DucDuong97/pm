
const { writeLog } = require('./log');

exports.dataOutput = (data, queue) => {
    writeLog(`child stdout: ${data}\n`, `${queue}.out`);
}

exports.errorOutput = (data, queue) => {
    writeLog(`child stderr: ${data}\n`, `${queue}.err`);
}