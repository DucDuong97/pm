
const fs = require("fs");
const path = require("path");

/**
 * @desc Write data to log
 */
exports.writeLog = (log, queue) => {
	let logs_dir = `${path.dirname(__dirname)}/logs/${queue}.log`;
	let datetime = new Date().toLocaleString('en-US', {
			timeZone: 'Asia/Bangkok'
	});
	let content = `[${datetime}] ${log}`;

	// Write log to file
	fs.writeFileSync(logs_dir, content,{
		encoding: "utf8",
		flag: "a",
	}, function (err) {
		if (err){
			console.log("Cannot log!");
		}
	});
}
