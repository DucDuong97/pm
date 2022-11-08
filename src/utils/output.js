
const { writeLog } = require('./log');

exports.dataOutput = (data, queue) => {
    writeLog(`child stdout: ${data}`, queue);
}

exports.errorOutput = (data, queue) => {
    writeLog(`child stderr: ${data}`, queue);
}