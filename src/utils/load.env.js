const path = require("path");

console.log("Loading env...");

const ROOT = path.dirname(path.dirname(__dirname));
const ENV_EXT = process.env.NODE_ENV == 'development' ? '':'local';
console.log(`${ROOT}/config.${ENV_EXT}.env`);
require('dotenv').config({ path:`${ROOT}/config.${ENV_EXT}.env` });