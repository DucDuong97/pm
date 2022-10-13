console.log("Loading env...");

const ROOT = require("path").dirname(__dirname);
const ENV_EXT = process.env.NODE_ENV == 'development' ? '':'.local';

require('dotenv').config({ path:`${ROOT}/.env${ENV_EXT}` });