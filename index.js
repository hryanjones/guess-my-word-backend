const express = require('express');
const bodyParser = require('body-parser');

const InMemoryDatabase = require('./InMemoryDatabase');
const FileBackups = require('./FileBackups');

FileBackups.recoverInMemoryDatabaseFromFiles();

const app = express();
const port = 8080;

/*
TODO:
1. need to be able to rebuild memory from stored file
2. (later) backup old file regularly (to public S3?)

FRONTEND:
1. Update frontend to post and handle response
2. (later, create issue?) if time is > 24 hours need to reset

*/

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(bodyParser.json())


app.get('/', res => res.status(201).send());

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

app.listen(port, () => console.log(`guess-my-word-backend listening on port ${port}!`))
