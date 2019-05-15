const getInvalidReason = require('./getInvalidReason');

const leadersByDateAndListAndName = {};

const MAX_NUMBER_OF_LEADERS_FOR_DAYS_WORD_LIST = 1000;

const InMemoryDatabase = {
    addLeader,
    getLeadersForKeys,
};

function addLeader({
    date,
    wordlist,
    name,
    guesses: bareGuesses,
    time: bareTime,
    submitTime,
}) {
    const time = parseInt(bareTime, 10);
    const guesses = parseGuesses(bareGuesses);

    const invalidReason = getInvalidReason(date, wordlist, name, time, guesses)
        || addLeaderToDatabase(date, wordlist, name, { submitTime, time, guesses });

    return invalidReason;

}
function parseGuesses(bareGuesses) {
    if (Array.isArray(bareGuesses)) return bareGuesses;
    return (bareGuesses || '').split(',');
}

function addLeaderToDatabase(date, wordlist, name, data) {
    const leaders = getLeadersForKeys(date, wordlist);
    if (Object.keys(leaders).length >= MAX_NUMBER_OF_LEADERS_FOR_DAYS_WORD_LIST) {
        return `Sorry, we only accept ${MAX_NUMBER_OF_LEADERS_FOR_DAYS_WORD_LIST} entries for the board in a day.`;
    }
    if (leaders[name]) return `Sorry, "${name}" is already taken. Please choose another.`;
    leaders[name] = data;
    return '';
}

function getLeadersForKeys(date, list, convertToNumberOfGuesses = false) {
    if (!leadersByDateAndListAndName[date]) {
        leadersByDateAndListAndName[date] = {}
    }
    if (!leadersByDateAndListAndName[date][list]) {
        leadersByDateAndListAndName[date][list] = {}
    }
    const leaders = leadersByDateAndListAndName[date][list];
    if (!convertToNumberOfGuesses) {
        return leaders;
    }
    return convertLeadersToNumberOfGuesses(leaders);
}

function convertLeadersToNumberOfGuesses(leaders) {
    const convertedLeaders = {};
    for (const leaderName in leaders) {
        const thisLeaderData = leaders[leaderName];
        convertedLeaders[leaderName] = Object.assign(
            {},
            thisLeaderData,
            { numberOfGuesses: thisLeaderData.guesses.length }
        )
        delete convertedLeaders[leaderName].guesses;
    }
    return convertedLeaders;
}

module.exports = InMemoryDatabase;
