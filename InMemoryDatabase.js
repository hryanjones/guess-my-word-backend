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

    const invalidReason = getInvalidReason(date, wordlist, name, time, guesses) ||
        addLeaderToDatabase(date, wordlist, name, { submitTime, time, guesses }); // the database could also return an invalid reason
    if (invalidReason) {
        console.info(`${submitTime} - ${name} - INVALID REASON: ${invalidReason}`);
    }

    return invalidReason;

}
function parseGuesses(bareGuesses) {
    if (Array.isArray(bareGuesses)) return bareGuesses;
    return (bareGuesses || '').split(',');
}

function addLeaderToDatabase(date, wordlist, name, data) {
    let leaders = getLeadersForKeys(date, wordlist);
    const numberOfLeaders = leaders && Object.keys(leaders).length || 0;
    if (numberOfLeaders >= MAX_NUMBER_OF_LEADERS_FOR_DAYS_WORD_LIST) {
        return `Sorry, we only accept ${MAX_NUMBER_OF_LEADERS_FOR_DAYS_WORD_LIST} entries for the board in a day.`;
    }
    if (!leaders) {
        leaders = instantiateLeaderList(date, wordlist);
    }
    if (leaders[name]) return `Sorry, "${name}" is already taken today. Please choose another name.`;
    leaders[name] = data;
    return '';
}

function getLeadersForKeys(date, list, convertToNumberOfGuesses = false) {
    if (date === 'ALL') {
        return getAllTimeLeaderboard(list);
    }

    const leaders = leadersByDateAndListAndName[date] && leadersByDateAndListAndName[date][list];
    if (!leaders) return leaders;

    if (!convertToNumberOfGuesses) {
        return leaders;
    }
    return convertLeadersToNumberOfGuesses(leaders);
}

function instantiateLeaderList(date, list) {
    if (!leadersByDateAndListAndName[date]) {
        leadersByDateAndListAndName[date] = {};
    }
    if (!leadersByDateAndListAndName[date][list]) {
        leadersByDateAndListAndName[date][list] = {};
    }
    return leadersByDateAndListAndName[date][list];
}

function convertLeadersToNumberOfGuesses(leaders) {
    const convertedLeaders = {};
    for (const leaderName in leaders) {
        const leaderData = leaders[leaderName];
        convertedLeaders[leaderName] = convertLeader(leaderData);
    }
    return convertedLeaders;
}

function convertLeader(leaderData) {
    const leaderCopy = Object.assign(
        {},
        leaderData,
        { numberOfGuesses: leaderData.guesses.length }
    );
    delete leaderCopy.guesses;
    return leaderCopy;
}

function getAllTimeLeaderboard(list) {
    const allTimeLeaders = {};
    for (const date in leadersByDateAndListAndName) {
        const leaders = getLeadersForKeys(date, list, true);

        for (const leaderName in leaders) {
            const leaderData = leaders[leaderName];
            const allTimeLeaderData = allTimeLeaders[leaderName];
            if (!allTimeLeaderData) {
                leaderData.playCount = 1;
                delete leaderData.submitTime;
                allTimeLeaders[leaderName] = leaderData;
            } else {
                allTimeLeaderData.playCount += 1;
                allTimeLeaderData.numberOfGuesses = Math.min(allTimeLeaderData.numberOfGuesses, leaderData.numberOfGuesses);
                allTimeLeaderData.time = Math.min(allTimeLeaderData.time, leaderData.time);
            }
        }
    }
    return allTimeLeaders;
}

module.exports = InMemoryDatabase;
