'use strict';

const {
    getInvalidReason,
    hasBadWord,
} = require('./getInvalidReason');
const { addLeaderAwards } = require('./LeaderAwards');
const { isProd, getNow } = require('./Utilities');

const ALL_TIME_LEADERS_BLACKLIST = ['DDDLLLL.SSSDDDUUUFFFEEERRR'];

const leadersByDateAndListAndName = {}; // see below for structure
/*
{
    [DateString]: { // e.g. '2019-06-04'
        [wordList: 'normal' or 'hard']: {
            [name]: {
                guesses: String[],
                time: Integer, // ms
                submitTime: ISODateString,
            }
        }
    }
}
*/

const allTimeLeadersCacheDataByListAndName = { // this is derived from reading through leadersByDateAndListAndName
    normal: {}, // see instantiateAllTimeLeader for internal structure
    hard: {},
};

const MIN_PLAY_COUNT_FOR_ALL_TIME_LEADERBOARD = 4;

const THAT_GUY_NAME = 'THAT GUY 🤦‍♀️';

const ALL_TIME_LEADERS_BY_LIST = {};

const LIMIT_FOR_FIRST_DAY_HIDING = 3;
const LIMIT_FOR_ALL_TIME_HIDING = 7;
const FIRST_DAY_TIME_IN_MS = 12 /* hours */ * 60 /* min/hour */ * 60 /* sec/min */ * 1000; /* ms */

const InMemoryDatabase = {
    addLeader,
    getLeadersArray,
    dumpDBToCSV,
};

function addLeader({
    date,
    wordlist,
    name,
    guesses: bareGuesses,
    time: bareTime,
    submitTime,
    areGuessesPublic,
}, fromBackup = false) {
    const time = parseInt(bareTime, 10);
    const guesses = parseGuesses(bareGuesses);

    const leaders = getLeadersForKeys(date, wordlist);
    let invalidReason = getInvalidReason(date, wordlist, name, time, guesses, leaders, fromBackup);
    if (invalidReason === 'inappropriate') {
        name = THAT_GUY_NAME;
        return addLeaderOrGetInvalidReason() || invalidReason;
    }
    invalidReason = invalidReason || addLeaderOrGetInvalidReason();
    if (invalidReason) {
        return logAndReturnInvalidReason(invalidReason, name);
    }

    return '';

    function addLeaderOrGetInvalidReason() {
        areGuessesPublic = areGuessesPublic === 'true' || areGuessesPublic === true;
        // the database could also return an invalid reason
        return addLeaderToDatabase(date, wordlist, name, { submitTime, time, guesses, areGuessesPublic });
    }
}

function logAndReturnInvalidReason(reason, name, prefix) {
    const logMessage = `${(getNow()).toISOString()} - ${name} - ${prefix || 'INVALID REASON'}: ${reason}`;
    if (isProd) console.log(logMessage); // print to log
    console.warn(logMessage); // print to stderr so easier to see outside of log tail
    return reason;
}

function parseGuesses(bareGuesses) {
    if (Array.isArray(bareGuesses)) return bareGuesses;
    return (bareGuesses || '').split(',');
}

function addLeaderToDatabase(date, wordlist, name, data) {
    let leaders = getLeadersForKeys(date, wordlist);
    if (!leaders) {
        leaders = instantiateLeaderList(date, wordlist);
    }
    if (leaders[name] && name !== THAT_GUY_NAME) return `Sorry, "${name}" is already taken today. Please choose another name.`;
    Object.freeze(data); // try to prevent accidental mutations of in memory database
    leaders[name] = data;
    return '';
}

function getLeadersArray(date, list, name, key) {
    let leaders;
    const type = date === 'ALL' ? 'allTime' : 'normal';
    const allTimeLeaders = getAllTimeLeaderboard(list, /* prefer cached if */ type === 'normal');
    if (type === 'allTime') {
        leaders = allTimeLeaders;
        const now = getNow();
        console.log(`${now.toISOString()} - Fetching all time leaderboard.`);
    } else {
        leaders = getLeadersForKeys(date, list);
        const includeGuesses = name && leaders && leaders[name] && leaders[name].guesses[0] === key;
        leaders = sanitizeLeaders(leaders, includeGuesses);
    }

    ALL_TIME_LEADERS_BY_LIST[list] = allTimeLeaders; // cache all time leaders

    addLeaderAwards(leaders, type, allTimeLeaders, name);
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

function sanitizeLeaders(leaders, includeGuesses) {
    const convertedLeaders = {};
    for (const leaderName in leaders) {
        const leaderData = leaders[leaderName];
        convertedLeaders[leaderName] = convertLeader(leaderData, includeGuesses);
    }
    return convertedLeaders;
}

function convertLeader(leaderData, includeGuesses) {
    const leaderCopy = Object.assign(
        {},
        leaderData,
        { numberOfGuesses: leaderData.guesses.length },
    );
    if (!includeGuesses || !leaderCopy.areGuessesPublic) {
        delete leaderCopy.guesses;
    } else {
        leaderCopy.guesses = leaderCopy.guesses.map(removeInappropriateGuesses);
    }
    delete leaderCopy.areGuessesPublic;

    if (leaderCopy.weeklyPlayRate) {
        leaderCopy.weeklyPlayRate = leaderCopy.weeklyPlayRate.toFixed(2);
    }
    return leaderCopy;

    function removeInappropriateGuesses(guess) {
        return hasBadWord(guess) || guess === 'dick' || guess === 'ass'
            ? '🙊'
            : guess;
    }
}

function getAllTimeLeaderboard(list, preferCached) {
    if (preferCached && ALL_TIME_LEADERS_BY_LIST[list]) {
        return ALL_TIME_LEADERS_BY_LIST[list];
    }

    for (const date in leadersByDateAndListAndName) {
        let leaders = getLeadersForKeys(date, list);
        leaders = sanitizeLeaders(leaders);

        for (const leaderName in leaders) {
            const leaderData = leaders[leaderName];
            updateAllTimeLeadersCache(list, leaderName, leaderData);
        }

        // need to recover memory
        // const shouldPurgeOldLeaders = new Date(date) < getEpochTimeForLeaderPurging();
        // if (shouldPurgeOldLeaders) {
        //     delete leadersByDateAndListAndName[date];
        // }
    }

    const allTimeLeaders = getAllTimeLeadersFromCache(list);
    calculateFinalStatistics(allTimeLeaders);
    return allTimeLeaders;
}

function updateAllTimeLeadersCache(list, name, data) {
    if (!allTimeLeadersCacheDataByListAndName[list][name]) {
        allTimeLeadersCacheDataByListAndName[list][name] = instantiateAllTimeLeader();
    }
    appendLeaderStatistics(allTimeLeadersCacheDataByListAndName[list][name], data);
}

const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
const twoWeeksInMilliseconds = 2 * 7 * oneDayInMilliseconds;

function instantiateAllTimeLeader() {
    return {
        playCount: 0, // int
        firstSubmitDate: '', // date
        bestNumberOfGuesses: Infinity, // int
        timeList: [], // int[]
        bestTime: Infinity, // int
        numberOfGuessesList: [], // int
        updatedTo: '', // date
    };
}

function appendLeaderStatistics(allTimeLeaderData, {
    time,
    numberOfGuesses,
    submitTime,
}) {
    const { updatedTo } = allTimeLeaderData;
    submitTime = new Date(submitTime);
    if (updatedTo && submitTime <= updatedTo) {
        return; // this record is already stored, don't duplicate
    }

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

    allTimeLeaderData.playCount = numberOfGuessesList.length;

    timeList.push(time);
    if (time < bestTime) {
        allTimeLeaderData.bestTime = time;
    }

    if (!allTimeLeaderData.firstSubmitDate || submitTime < allTimeLeaderData.firstSubmitDate) {
        allTimeLeaderData.firstSubmitDate = floorDate(submitTime);
    }
    allTimeLeaderData.updatedTo = submitTime;
}

function getAllTimeLeadersFromCache(list) {
    const cachedLeadersByName = allTimeLeadersCacheDataByListAndName[list];
    const twoWeeksAgo = new Date(getNow() - twoWeeksInMilliseconds);
    const allTimeLeaders = {};
    for (const name in cachedLeadersByName) {
        const leader = cachedLeadersByName[name];
        if (leader.playCount >= MIN_PLAY_COUNT_FOR_ALL_TIME_LEADERBOARD
            && !ALL_TIME_LEADERS_BLACKLIST.includes(name)
            && leader.updatedTo >= twoWeeksAgo) {
            allTimeLeaders[name] = { ...leader };
        }
    }
    return allTimeLeaders;
}

const MILLISECONDS_IN_A_DAY = 1000 /* ms per s */ * 60 /* s per min */ * 60 /* min per hour */
    * 24; /* hour per day */
const MILLISECONDS_IN_A_WEEK = MILLISECONDS_IN_A_DAY * 7; /* days per week */

function calculateFinalStatistics(leaders) {
    const now = floorDate(getNow());
    for (const name in leaders) {
        const leader = leaders[name];

        delete leader.updatedTo;

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
    if (date.toString().includes('GMT+0000')) {
        date = +date - (8 * 60 * 60 * 1000); // subtract 8 hours to be more like Pacific
    }
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

function getEpochTimeForLeaderPurging() {
    return +getNow() - (3 * 24 * 60 * 60 * 1000); // anything older than 3 days is definitely not a new submit.
}

function dumpDBToCSV() {
    console.log('date,wordlist,word,name,submitTime,time,numberOfGuesses,guesses');
    for (const date in leadersByDateAndListAndName) {
        const leadersByList = leadersByDateAndListAndName[date];
        for (const wordlist in leadersByList) {
            const leadersByName = leadersByList[wordlist];
            for (let name in leadersByName) {
                const { time, submitTime, guesses } = leadersByName[name];
                name = name.replace(/"/g, '\\"')
                const numberOfGuesses = guesses.length;
                const word = guesses[numberOfGuesses - 1];
                console.log(`${date},${wordlist},${word},"${name}",${submitTime},${time},${numberOfGuesses},"${guesses.join(' ')}"`);
            }
        }
    }
}

module.exports = InMemoryDatabase;
