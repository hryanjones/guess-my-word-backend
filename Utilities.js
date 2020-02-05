const os = require('os');

const Utilities = {
    isProd: os.userInfo().username === 'root',
};

module.exports = Utilities;
