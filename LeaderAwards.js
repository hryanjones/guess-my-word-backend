const LeaderAwards = {
    addLeaderAwards,
};

const LUCKY_AWARD = '🍀 lucky?';
const LUCKY_BUGGER_GUESS_COUNT_THRESHOLD = 5;
const THAT_GUY_NAME = 'THAT GUY 🤦‍♀️'; // name that signifies a user is using an inappropriate username
const LUCKY_BUGGER_PLAY_COUNT_THRESHOLD = 10;

function addLeaderAwards(leadersByName, type, allTimeLeaders, requester) {
    const awardTrackers = getNewAwardTrackers(type);
    const luckyTracker = {
        names: [],
        award: LUCKY_AWARD,
    };

    for (const name in leadersByName) {
        const leader = leadersByName[name];
        prepareLeaderForBoard(leader, name);

        if (isLucky(leader, allTimeLeaders, requester)) {
            luckyTracker.names.push(name);
            continue; // eslint-disable-line
        }
        awardTrackers.forEach((tracker) => {
            recordAwards(leader, tracker);
        });
    }

    awardTrackers.push(luckyTracker);

    awardTrackers.forEach((tracker) => {
        addAwards(tracker, leadersByName);
    });

    Object.values(leadersByName).forEach((leader) => {
        if (leader.awards.length > 0) {
            leader.awards = leader.awards.join(', ');
        } else {
            delete leader.awards;
        }
    });
    return leadersByName;
}

function isLucky(leader, allTimeLeaders, requester) {
    const dailyBoard = Number.isInteger(leader.numberOfGuesses);
    const allTimeRecord = allTimeLeaders[leader.name];
    const playCount = allTimeRecord && allTimeRecord.playCount || 0;
    return dailyBoard
        && leader.numberOfGuesses <= LUCKY_BUGGER_GUESS_COUNT_THRESHOLD
        && leader.name !== requester // don't call a person themselves lucky
        && playCount < LUCKY_BUGGER_PLAY_COUNT_THRESHOLD; // more dedicated players can be on the top
}


function getNewAwardTrackers(type) {
    if (type !== 'allTime') {
        return [
            {
                value: Infinity,
                key: 'time',
                names: [],
                award: '🏆 fastest',
            },
            {
                value: Infinity,
                key: 'numberOfGuesses',
                names: [],
                award: '🏆 fewest guesses',
            },
            {
                value: 'ZZZZ', // submitTime is ISO string
                key: 'submitTime',
                names: [],
                award: '🏅 first guesser',
            },
        ];
    }
    return [
        {
            value: 0,
            key: 'weeklyPlayRate',
            names: [],
            award: '🏆👏 highest weekly rate',
            reverse: true,
        },
        {
            value: Infinity,
            key: 'timeMedian',
            names: [],
            award: '🏆👏 fastest median',
        },
        {
            value: Infinity,
            key: 'numberOfGuessesMedian',
            names: [],
            award: '🏆👏 fewest median guesses',
        },
        {
            value: Infinity,
            key: 'bestTime',
            names: [],
            award: '🏆 fastest',
        },
        {
            value: Infinity,
            key: 'bestNumberOfGuesses',
            names: [],
            award: '🏆 fewest guesses',
        },
        {
            value: 0,
            key: 'playCount',
            names: [],
            award: '🏅 most plays',
            reverse: true,
        },
    ];
}

function prepareLeaderForBoard(leader, name) {
    leader.name = name;
    leader.awards = [];
}

function recordAwards(leader, tracker) {
    if (leader.name === THAT_GUY_NAME) return;
    const { key, value, reverse } = tracker;
    const leaderValue = leader[key];
    const isLeaderValueBetter = reverse
        ? leaderValue > value
        : leaderValue < value;
    if (isLeaderValueBetter) {
        tracker.value = leaderValue;
        tracker.names = [leader.name];
    } else if (leaderValue === value) {
        tracker.names.push(leader.name);
    }
}

function addAwards({ award, names }, leadersByName) {
    names.forEach((name) => {
        leadersByName[name].awards.push(award);
    });
}

module.exports = LeaderAwards;
