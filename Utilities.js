const os = require('os');

const Utilities = {
    isProd: os.userInfo().username === 'root',
    getNow: () => new Date(), // in the future this will be mockable by tests
};

module.exports = Utilities;
