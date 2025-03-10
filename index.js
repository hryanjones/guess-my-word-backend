const express = require('express');
const expressLogging = require('express-logging');
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

app.use(expressLogging(console));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    // res.header('Access-Control-Allow-Origin', 'https://hryanjones.com');
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
    const privateKey = fs.readFileSync(`/etc/letsencrypt/live/${hostname}/privkey.pem`, 'utf8');
    const certificate = fs.readFileSync(`/etc/letsencrypt/live/${hostname}/fullchain.pem`, 'utf8');
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
