const express = require('express')
const InMemoryDatabase = require('./InMemoryDatabase');

const app = express()
const port = 8080

/*
TODO:
5. need to store data to a file
https://stackoverflow.com/questions/3459476/how-to-append-to-a-file-in-node/43370201#43370201
6. need to be able to rebuild memory from stored file
7. backup old file regularly (to public S3?)

Frontend updates:
1. if time is > 24 hours need to reset
*/

app.get('/', (res) => res.status(201).send());

app.post('/leaderboard/:timezonelessDate/wordlist/:wordlist', (req, res) => {
    const {timezonelessDate: date, wordlist} = req.params;
    let {name, time, guesses} = req.query;
    const submitTime = (new Date()).toISOString();

    const invalidReason = InMemoryDatabase.addLeader({date, wordlist, name, time, submitTime, guesses});
    if (invalidReason) return res.status(400).send(invalidReason)

    res.send(
        InMemoryDatabase.getLeadersForKeys(date, wordlist, true)
    );

    backupToFile(date, wordlist, [name, submitTime, time, `"${guesses}"`]);
})

app.listen(port, () => console.log(`guess-my-word-backend listening on port ${port}!`))


function backupToFile(date, wordlist, data) { // FIXME move this functionality to it's own file
    console.log(`will write the below line to 'backupLeaderboards/${date}_${wordlist}.csv:
${data.join(',')}`);
}
