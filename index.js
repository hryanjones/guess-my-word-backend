const express = require('express');
const https = require('https');
const bodyParser = require('body-parser');
const fs = require('fs');

const InMemoryDatabase = require('./InMemoryDatabase');
const FileBackups = require('./FileBackups');

const privateKey = fs.readFileSync('/etc/letsencrypt/live/home.hryanjones.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/home.hryanjones.com/fullchain.pem', 'utf8');
const app = express();
const credentials = { key: privateKey, cert: certificate };
const httpsServer = https.createServer(credentials, app);

FileBackups.recoverInMemoryDatabaseFromFiles();

/*
TODO:
1. (later) backup old file regularly (to public S3?)

FRONTEND:
1. (later, create issue?) if time is > 24 hours need to reset
*/

app.use((req, res, next) => {
    // res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Origin', 'hryanjones.com');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(bodyParser.json())


app.get('/', (req, res) => res.status(201).send());

app.post('/leaderboard/:timezonelessDate/wordlist/:wordlist', (req, res) => {
    const { timezonelessDate: date, wordlist } = req.params;
    const data = Object.keys(req.query).length ? req.query : req.body; // might be better to just rewrite tests to use JSON :\;
    const { time, guesses } = data;

    const name = (data.name || '').trim();
    const submitTime = (new Date()).toISOString();

    const invalidReason = InMemoryDatabase.addLeader({
        date,
        wordlist,
        name,
        time,
        submitTime,
        guesses,
    });
    if (invalidReason) return res.status(400).send({ invalidReason });

    res.send(
        InMemoryDatabase.getLeadersForKeys(date, wordlist, true)
    );

    FileBackups.backupEntry({ date, wordlist, name, submitTime, time, guesses });
})

httpsServer.listen(443);
