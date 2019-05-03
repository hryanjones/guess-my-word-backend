const express = require('express')
const app = express()
const port = 8080

/*
TODO:
1. store guesses instead of number of guesses (needs frontend change)
2. when returning, return number of guesses
3. on storing, store word as well
4. need validate word is expected
5. need to store data to a file
6. need to be able to rebuild memory from stored file
*/

const leadersByDateAndListAndName = {};

app.post('/leaderboard/:timezonelessDate/wordlist/:wordlist', (req, res) => {
    const {timezonelessDate: date, wordlist} = req.params;
    let {word, name, time, numberOfGuesses} = req.query;

    time = parseInt(time);
    numberOfGuesses = parseInt(numberOfGuesses);

    const invalidReason = addLeader(date, wordlist, word, name, {time, numberOfGuesses, submitTime: (new Date()).toISOString()});
    if (invalidReason) return res.status(400).send(invalidReason)

    res.send(getLeadersForKeys(date, wordlist));
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))



function addLeader(date, wordlist, word, name, data) {
    let invalidReason = getInvalidReason(date, wordlist, word, name, data.time, data.numberOfGuesses)
    if (invalidReason) return invalidReason

    const leaders = getLeadersForKeys(date, wordlist)
    if (leaders[name]) return `Sorry, "${name}" is already taken.`
    leaders[name] = data
}

function getLeadersForKeys(date, list) {
    if (!leadersByDateAndListAndName[date]) {
        leadersByDateAndListAndName[date] = {}
    }
    if (!leadersByDateAndListAndName[date][list]) {
        leadersByDateAndListAndName[date][list] = {}
    }
    return leadersByDateAndListAndName[date][list]
}

// Validation

const timezonelessDateMatcher = /^2[0-1][0-9]{2}-[0-1][0-9]-[0-9]{2}$/
const acceptableLists = ['normal', 'hard']
const wordMatcher = /^[a-z]{2,12}$/ // FIXME get actual longest word from frontend
const maxNameLength = 128
const maxNumberOfGuesses = 200
const maxTime = 24 * 60 * 60 * 1000 // max time is 24 hours

function getInvalidReason(date, wordlist, word, name, time, numberOfGuesses) {
    if (!timezonelessDateMatcher.test(date)) {
        return `Date isn't the correct format, like "2019-04-30". You sent: "${date}".`
    }
    if (!acceptableLists.includes(wordlist)) {
        return `wordlist isn't one of known lists: ${acceptableLists.join(', ')}. You gave: ${wordlist}}.`
    }
    if (!word || !wordMatcher.test(word)) {
        return `Word isn't the correct format of all lowercase letters, less than 12. You sent: "${word}".`;
    }
    if (name.length > maxNameLength) {
        return `Name can't be longer than ${maxNameLength}. Yours is ${name.length}.`
    }
    if (!numberIsBetweenRange(time, 0, maxTime)) {
        return `Time must be a positive number less than 24 hours. You gave ${time}ms.`
    }
    if (!numberIsBetweenRange(numberOfGuesses, 0, maxNumberOfGuesses)) {
        return `NumberOfGuesses must be a positive number less than ${maxNumberOfGuesses}. You gave: ${numberOfGuesses} .`
    }
    return ''
}

function numberIsBetweenRange(number, min, max) {
    return Number.isFinite(number) &&
        number > min &&
        number < max;
}