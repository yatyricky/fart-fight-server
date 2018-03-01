const moment = require('moment');

class Logger {
    static i(message) {
        console.log(moment.utc().format('YYYY-MM-DDTHH:mm:ss') + '|' + message);
    }

    static e(message) {
        console.error(moment.utc().format('YYYY-MM-DDTHH:mm:ss') + '|' + message);
    }
}

module.exports = Logger;