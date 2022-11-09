
const { writeLog } = require('./log');

exports.dataOutput = (data, queue) => {
    writeLog(`${data}\n`, `${queue}.out`);
}

exports.errorOutput = (data, queue) => {
    writeLog(`${data}\n`, `${queue}.err`);
}