const getInvalidReason = require('./getInvalidReason');

const leadersByDateAndListAndName = {};

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
    const guesses = (bareGuesses || '').split(',');

    const invalidReason = getInvalidReason(date, wordlist, name, time, guesses);

    if (invalidReason) return invalidReason;

    const leaders = getLeadersForKeys(date, wordlist)
    if (leaders[name]) return `Sorry, "${name}" is already taken.`;
    leaders[name] = {
        submitTime,
        time,
        guesses,
    };
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
