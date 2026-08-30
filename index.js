const express = require('express');
const https = require('https');
const http = require('http');
const bodyParser = require('body-parser');
const fs = require('fs');

const { isProd } = require('./Utilities');
const { NO_RESPONSE_INVALID_REASONS } = require('./getInvalidReason');
const InMemoryDatabase = require('./InMemoryDatabase');
const FileBackups = require('./FileBackups');

const app = express();

const additionalFilesToRecover = FileBackups.recoverInMemoryDatabaseFromFiles();

// InMemoryDatabase.dumpDBToCSV();
// process.exit();

function requestLoggingMiddleware(req, res, next) {
    const startTime = Date.now();
    const requestId = Math.random().toString(16).slice(2, 6);
    const userAgent = (req.get('user-agent') || '-').slice(0, 80);

    console.log(`${new Date().toISOString()} [${requestId}] Request from ${req.ip}: ${req.method} ${req.originalUrl} UA: "${userAgent}"`);

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`${new Date().toISOString()} [${requestId}] Response with status ${res.statusCode} in ${duration} ms.`);
    });

    next();
}

app.use(requestLoggingMiddleware);

// CORS: allow only the game's own front-end origin(s).
const ALLOWED_ORIGINS = new Set([
    'https://hryanjones.com',
    'https://www.hryanjones.com',
]);

app.use((req, res, next) => {
    const { origin } = req.headers;
    if (ALLOWED_ORIGINS.has(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Vary', 'Origin');
    }
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(bodyParser.json());

app.get('/', (req, res) => res.status(201).send());

app.get('/leaderboard/:timezonelessDate/wordlist/:wordlist', (req, res) => {
    const { name, key } = req.query; // required for making a request that contains user guesses
    const { timezonelessDate: date, wordlist } = req.params;
    res.send(
        InMemoryDatabase.getLeadersArray(date, wordlist, name, key)
    );
});

const INVALID_REASON_CONTEXT_MATCHER = /\. .*/; // everything after the period is just context in the reason

app.post('/leaderboard/:timezonelessDate/wordlist/:wordlist', (req, res) => {
    const { timezonelessDate: date, wordlist } = req.params;

    // might be better to just rewrite tests to use JSON :\;
    const data = Object.keys(req.query).length ? req.query : req.body;

    const { time, guesses, areGuessesPublic } = data;

    const name = (data.name || '').trim();
    const submitTime = (new Date()).toISOString();

    const invalidReason = InMemoryDatabase.addLeader({
        date,
        wordlist,
        name,
        time,
        submitTime,
        guesses,
        areGuessesPublic,
    });
    if (invalidReason === 'inappropriate') {
        return setTimeout(respond, 30000);
    }
    const reasonWithoutContext = invalidReason.replace(INVALID_REASON_CONTEXT_MATCHER, '');
    // console.log('reason without context -------', reasonWithoutContext)
    if (NO_RESPONSE_INVALID_REASONS.has(reasonWithoutContext)) {
        return setTimeout(respond, 2000);
    }
    if (invalidReason) {
        return res.status(400).send({ invalidReason });
    }

    respond();

    FileBackups.backupEntry({
        date, wordlist, name, submitTime, time, guesses, areGuessesPublic,
    });

    function respond() {
        res.status(201).send({});
    }
});

if (isProd) {
    // const hostname = 'home.hryanjones.com';
    const hostname = 'ec2.hryanjones.com';
    // When run under systemd as a non-root user, the TLS files are supplied via
    // LoadCredential in $CREDENTIALS_DIRECTORY (readable only by this service).
    // Fall back to the letsencrypt path for the legacy root launcher.
    const credentialsDir = process.env.CREDENTIALS_DIRECTORY;
    const privkeyPath = credentialsDir ? `${credentialsDir}/privkey.pem` : `/etc/letsencrypt/live/${hostname}/privkey.pem`;
    const fullchainPath = credentialsDir ? `${credentialsDir}/fullchain.pem` : `/etc/letsencrypt/live/${hostname}/fullchain.pem`;
    const privateKey = fs.readFileSync(privkeyPath, 'utf8');
    const certificate = fs.readFileSync(fullchainPath, 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    const httpsServer = https.createServer(credentials, app);

    httpsServer.listen(443);
    console.log('listening on 443');
} else {
    const httpServer = http.createServer(app);
    httpServer.listen(8080);
    console.log('listening on 8080');
}

FileBackups.asyncContinueRecovery(additionalFilesToRecover);
