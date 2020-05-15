'use strict';

const {
    getInvalidReason,
    getInvalidBadNameReport,
    hasBadWord,
} = require('./getInvalidReason');
const { addLeaderAwards } = require('./LeaderAwards');
const { isProd } = require('./Utilities');
const ALL_TIME_LEADERS_BLACKLIST = ['DDDLLLL.SSSDDDUUUFFFEEERRR'];

const leadersByDateAndListAndName = {}; // see below for structure
/*
{
    [DateString]: {
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

const MIN_PLAY_COUNT_FOR_ALL_TIME_LEADERBOARD = 4;

const THAT_GUY_NAME = 'THAT GUY 🤦‍♀️';

const ALL_TIME_LEADERS_BY_LIST = {};

let BAD_NAMES_BY_NAME = {}; // see below for structure
/*
{
    [name: string]: {
        firstReportDate: Date,
        reportedByOnFirstDay: String[],
        reportedByAfterFirstDay: String[],
    }
*/
const LIMIT_FOR_FIRST_DAY_HIDING = 3;
const LIMIT_FOR_ALL_TIME_HIDING = 7;
const FIRST_DAY_TIME_IN_MS = 12 /* hours */ * 60 /* min/hour */ * 60 /* sec/min */ * 1000; /* ms */

const InMemoryDatabase = {
    addLeader,
    getLeadersArray,
    addBadName,
    setBadNames(badNames) {
        for (const name in badNames) {
            badNames[name].firstReportDate = new Date(badNames[name].firstReportDate);
        }
        BAD_NAMES_BY_NAME = badNames;
    },
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
    const logMessage = `${(new Date()).toISOString()} - ${name} - ${prefix || 'INVALID REASON'}: ${reason}`;
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
        const now = new Date();
        console.log(`${now.toISOString()} - Fetching all time leaderboard.`);
    } else {
        leaders = getLeadersForKeys(date, list);
        const includeGuesses = name && leaders[name] && leaders[name].guesses[0] === key;
        leaders = sanitizeLeaders(leaders, includeGuesses);
    }

    ALL_TIME_LEADERS_BY_LIST[list] = allTimeLeaders; // cache all time leaders

    addLeaderAwards(leaders, type, allTimeLeaders);
    markBadNames(leaders);
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

    removeLowPlayAndBadLeaders(allTimeLeaders);
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

function removeLowPlayAndBadLeaders(allTimeLeaderData) {
    for (const name in allTimeLeaderData) {
        const leader = allTimeLeaderData[name];
        if (leader.playCount < MIN_PLAY_COUNT_FOR_ALL_TIME_LEADERBOARD ||
            ALL_TIME_LEADERS_BLACKLIST.includes(name)) {
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

/*
TODO:
2. Add in the badName return data to the frontend based on BAD_NAMES_BY_NAME
3. file backup and recovery of BAD_NAMES_BY_NAME
4. frontend work to report
*/
function addBadName(report) {
    const {
        reporterName,
        badName,
        date,
        wordlist,
    } = report;
    const leadersList = getLeadersForKeys(date, wordlist);
    const invalidReason = getInvalidBadNameReport(report, leadersList);
    if (invalidReason) {
        logAndReturnInvalidReason(invalidReason, reporterName, 'BAD NAME INVALID REPORT');
        return null;
    }
    const now = new Date();
    const badActor = BAD_NAMES_BY_NAME[badName] || getBaseBadNameRecord();
    if (isFirstDayForBadActor(badActor, +now - FIRST_DAY_TIME_IN_MS)) {
        addUniqueReporter(reporterName, badActor.reportedByOnFirstDay);
    } else {
        addUniqueReporter(reporterName, badActor.reportedByAfterFirstDay);
    }
    BAD_NAMES_BY_NAME[badName] = badActor;

    return BAD_NAMES_BY_NAME;

    function addUniqueReporter(name, list) {
        if (!list.includes(name)) {
            list.push(name);
        }
    }
}

function getBaseBadNameRecord() {
    return {
        firstReportDate: new Date(),
        reportedByOnFirstDay: [],
        reportedByAfterFirstDay: [],
    };
}

function isFirstDayForBadActor(badActor, epochFirstDayCutoff) {
    return epochFirstDayCutoff < badActor.firstReportDate;
}

function markBadNames(leadersByName) {
    getFilterableBadNames().forEach((badName) => {
        const badLeader = leadersByName[badName];
        if (badLeader) {
            badLeader.badName = true;
        }
    });
}

function getFilterableBadNames() {
    const badNames = Object.keys(BAD_NAMES_BY_NAME);
    const now = new Date();
    const epochFirstDayCutoff = +now - FIRST_DAY_TIME_IN_MS;
    return badNames.filter((name) => {
        const actor = BAD_NAMES_BY_NAME[name];
        const firstDayReports = actor.reportedByOnFirstDay.length;
        const laterReports = actor.reportedByAfterFirstDay.length;
        if (isFirstDayForBadActor(actor, epochFirstDayCutoff)) {
            return firstDayReports >= LIMIT_FOR_FIRST_DAY_HIDING;
        }
        return (firstDayReports + laterReports) >= LIMIT_FOR_ALL_TIME_HIDING;
    });
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

// [DateString]: {
//     [wordList: 'normal' or 'hard']: {
//         [name]: {
//             guesses: String[],
//                 time: Integer, // ms
//                     submitTime: ISODateString,
//             }
//     }

module.exports = InMemoryDatabase;
