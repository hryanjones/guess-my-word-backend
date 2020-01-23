'use strict';

const { getInvalidReason } = require('./getInvalidReason');
const { addLeaderAwards } = require('./LeaderAwards');

const leadersByDateAndListAndName = {};

const MAX_NUMBER_OF_LEADERS_FOR_DAYS_WORD_LIST = 20000;

const MIN_PLAY_COUNT_FOR_ALL_TIME_LEADERBOARD = 4;

const THAT_GUY_NAME = 'THAT GUY 🤦‍♀️';

const InMemoryDatabase = {
    addLeader,
    getLeadersArray,
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

    let invalidReason = getInvalidReason(date, wordlist, name, time, guesses);
    if (invalidReason === 'inappropriate') {
        name = THAT_GUY_NAME;
        return addLeaderOrGetInvalidReason() || invalidReason;
    }
    invalidReason = invalidReason || addLeaderOrGetInvalidReason();
    if (invalidReason) {
        console.warn(`${submitTime} - ${name} - INVALID REASON: ${invalidReason}`);
    }

    return invalidReason;

    function addLeaderOrGetInvalidReason() {
        // the database could also return an invalid reason
        return addLeaderToDatabase(date, wordlist, name, { submitTime, time, guesses });
    }
}

function parseGuesses(bareGuesses) {
    if (Array.isArray(bareGuesses)) return bareGuesses;
    return (bareGuesses || '').split(',');
}

function addLeaderToDatabase(date, wordlist, name, data) {
    let leaders = getLeadersForKeys(date, wordlist);
    const numberOfLeaders = (leaders && Object.keys(leaders).length) || 0;
    if (numberOfLeaders >= MAX_NUMBER_OF_LEADERS_FOR_DAYS_WORD_LIST) {
        return `Sorry, we only accept ${MAX_NUMBER_OF_LEADERS_FOR_DAYS_WORD_LIST} entries for the board in a day.`;
    }
    if (!leaders) {
        leaders = instantiateLeaderList(date, wordlist);
    }
    if (leaders[name] && name !== THAT_GUY_NAME) return `Sorry, "${name}" is already taken today. Please choose another name.`;
    Object.freeze(data); // try to prevent accidental mutations of in memory database
    leaders[name] = data;
    return '';
}

function getLeadersArray(date, list) {
    let leaders;
    const type = date === 'ALL' ? 'allTime' : 'normal';
    if (date === 'ALL') {
        leaders = getAllTimeLeaderboard(list);
    } else {
        leaders = getLeadersForKeys(date, list);
        leaders = sanitizeLeaders(leaders);
    }

    addLeaderAwards(leaders, type);
    return Object.values(leaders);
}

function getLeadersForKeys(date, list) {
    return leadersByDateAndListAndName[date] && leadersByDateAndListAndName[date][list];
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

function sanitizeLeaders(leaders) {
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
        { numberOfGuesses: leaderData.guesses.length },
    );
    delete leaderCopy.guesses;

    if (leaderCopy.weeklyPlayRate) {
        leaderCopy.weeklyPlayRate = leaderCopy.weeklyPlayRate.toFixed(2);
    }
    return leaderCopy;
}

function getAllTimeLeaderboard(list) {
    const allTimeLeaders = {};

    for (const date in leadersByDateAndListAndName) {
        let leaders = getLeadersForKeys(date, list);
        leaders = sanitizeLeaders(leaders);


        for (const leaderName in leaders) {
            const leaderData = leaders[leaderName];
            const allTimeLeaderData = allTimeLeaders[leaderName];
            if (!allTimeLeaderData) {
                allTimeLeaders[leaderName] = instantiateAllTimeLeader(leaderData);
            } else {
                appendLeaderStatistics(allTimeLeaderData, leaderData);
            }
        }
    }

    removeLowPlayLeaders(allTimeLeaders);
    calculateFinalStatistics(allTimeLeaders);
    return allTimeLeaders;
}

function instantiateAllTimeLeader({
    submitTime,
    numberOfGuesses,
    time,
}) {
    return {
        playCount: 1,
        firstSubmitDate: floorDate(submitTime),
        bestTime: time,
        // bestTimeWord: '', // TODO
        timeList: [time],
        bestNumberOfGuesses: numberOfGuesses,
        // bestNumberOfGuessesWord: '', // TODO
        numberOfGuessesList: [numberOfGuesses],
    };
}

function appendLeaderStatistics(allTimeLeaderData, {
    time,
    numberOfGuesses,
    submitTime,
}) {
    allTimeLeaderData.playCount += 1;

    const {
        numberOfGuessesList,
        bestNumberOfGuesses,
        timeList,
        bestTime,
    } = allTimeLeaderData;

    numberOfGuessesList.push(numberOfGuesses);
    if (numberOfGuesses < bestNumberOfGuesses) {
        allTimeLeaderData.bestNumberOfGuesses = numberOfGuesses;
    }

    timeList.push(time);
    if (time < bestTime) {
        allTimeLeaderData.bestTime = time;
    }

    if (submitTime < allTimeLeaderData.firstSubmitDate) {
        allTimeLeaderData.firstSubmitDate = floorDate(submitTime);
    }
}

function removeLowPlayLeaders(allTimeLeaderData) {
    for (const name in allTimeLeaderData) {
        const leader = allTimeLeaderData[name];
        if (leader.playCount < MIN_PLAY_COUNT_FOR_ALL_TIME_LEADERBOARD) {
            delete allTimeLeaderData[name];
        }
    }
}

const MILLISECONDS_IN_A_DAY = 1000 /* ms per s */ * 60 /* s per min */ * 60 /* min per hour */
    * 24; /* hour per day */
const MILLISECONDS_IN_A_WEEK = MILLISECONDS_IN_A_DAY * 7; /* days per week */

function calculateFinalStatistics(leaders) {
    const now = floorDate(new Date());
    for (const name in leaders) {
        const leader = leaders[name];

        leader.numberOfGuessesMedian = getFlooredMedian(leader.numberOfGuessesList);
        delete leader.numberOfGuessesList;

        leader.timeMedian = getFlooredMedian(leader.timeList);
        delete leader.timeList;

        const numberOfWeeksPlayed = (now - leader.firstSubmitDate)
            / MILLISECONDS_IN_A_WEEK;

        // it's not possible to have more than 7 so cap it
        leader.weeklyPlayRate = Math.min(7, leader.playCount / numberOfWeeksPlayed);
    }
}

function floorDate(date) {
    date = new Date(date);
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
}

function getFlooredMedian(array) {
    array = [...array];
    array.sort(numericSort);

    // length = 4 => 2nd thing => index of 1
    // length = 3 => 2nd thing => index of 1
    // length 16 => 8th thing => index of 7
    // length 17 => 8th thing => index of 7
    const indexOfMedian = Math.ceil(array.length / 2) - 1;
    return array[indexOfMedian];
}

function numericSort(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}
module.exports = InMemoryDatabase;
