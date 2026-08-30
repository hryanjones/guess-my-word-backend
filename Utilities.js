const os = require('os');

// Prod mode = serve HTTPS on 443. Driven by an explicit env var so the app can
// run as a non-root user (systemd sets NODE_ENV=production). The legacy check —
// running as root — is kept as a fallback so the old root launcher still works.
const isProd = process.env.NODE_ENV === 'production' || os.userInfo().username === 'root';

const Utilities = {
    isProd,
    getNow: () => new Date(), // in the future this will be mockable by tests
};

module.exports = Utilities;
