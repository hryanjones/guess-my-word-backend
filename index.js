const express = require('express')
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

app.get('/', res => res.status(201).send());

app.post('/leaderboard/:timezonelessDate/wordlist/:wordlist', (req, res) => {
    const { timezonelessDate: date, wordlist } = req.params;
    const { name, time, guesses } = req.query;
    const submitTime = (new Date()).toISOString();

    const invalidReason = InMemoryDatabase.addLeader({
        date,
        wordlist,
        name,
        time,
        submitTime,
        guesses,
    });
    if (invalidReason) return res.status(400).send(invalidReason);

    res.send(
        InMemoryDatabase.getLeadersForKeys(date, wordlist, true)
    );

    FileBackups.backupEntry({ date, wordlist, name, submitTime, time, guesses });
})

app.listen(port, () => console.log(`guess-my-word-backend listening on port ${port}!`))
