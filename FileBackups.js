const fs = require('fs');
const path = require('path');
const InMemoryDatabase = require('./InMemoryDatabase');

const backupFileStreamsByDateAndWordlist = {};

function backupEntry({ date, wordlist, name, submitTime, time, guesses, areGuessesPublic }) {
    const data = [sanitizeName(name), submitTime, time, quote(guesses), Boolean(areGuessesPublic)];
    const stream = getStream(date, wordlist);
    stream.write(`${data.join(',')}\n`);
}

function sanitizeName(name) {
    return quote(name.replace(/"/g, '\\"'));
}

function quote(string) {
    if (Array.isArray(string)) {
        quote(string.join(','));
    }
    return `"${string}"`;
}

const backupFileHeader = 'name,submitTime,timeInMilliSeconds,guesses,areGuessesPublic\n';

function getStream(date, wordlist) {
    if (!backupFileStreamsByDateAndWordlist[date]) {
        backupFileStreamsByDateAndWordlist[date] = {};
    }

    let stream = backupFileStreamsByDateAndWordlist[date][wordlist];
    if (stream) return stream;

    const filename = path.join(__dirname, `backupLeaderboards/${date}_${wordlist}.csv`);
    const fileAlreadyExists = fs.existsSync(filename);
    stream = fs.createWriteStream(filename, { flags: 'a' });
    if (!fileAlreadyExists) {
        stream.write(backupFileHeader);
    }
    backupFileStreamsByDateAndWordlist[date][wordlist] = stream;

    return stream;
}

const DATA_LINE_DESTRUCTURE_PATTERN = /^"(.*)",([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z),([0-9]+),"([a-z,]+)",?(true|false)?$/;
// Example of a data line:
// "Foogey",2019-05-12T00:14:38.329Z,800000,"acrid,whatever,finger,put,shoot,blah,eight,either"

const BACKUP_FILENAME_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}_(hard|normal)\.csv$/;
// Example of fileName:
// 2019-04-30_normal.csv

const recoveryDirectory = path.join(__dirname, 'backupLeaderboards/');

function recoverInMemoryDatabaseFromFiles() {
    const fileNames = fs.readdirSync(recoveryDirectory)
        .filter(name => BACKUP_FILENAME_PATTERN.test(name));
    if (!fileNames.length) return [];

    const mostRecentFiles = fileNames.slice(-4);
    const restOfFiles = fileNames.slice(0, -4);

    console.log(`Recovering in-memory database from ${fileNames.length} fileNames.`);
    mostRecentFiles.forEach(recoverFile);

    return restOfFiles;
}

function asyncContinueRecovery(fileNames) {
    if (!fileNames.length) {
        InMemoryDatabase.getLeadersArray('ALL', 'hard'); // cache the leaderboard
        InMemoryDatabase.getLeadersArray('ALL', 'normal'); // cache the leaderboard
        return;
    }

    const fileName = fileNames.pop();
    recoverFile(fileName);
    setTimeout(() => asyncContinueRecovery(fileNames), 0);
}

function recoverFile(fileName) {
    const [date, wordlist] = fileName.replace(/\.csv$/, '').split('_');
    const lines = fs.readFileSync(recoveryDirectory + fileName, 'utf8')
        .split('\n')
        .slice(1, -1); // remove first and last lines as it's a header and a newline

    lines.forEach((line) => {
        const lineMatch = line.match(DATA_LINE_DESTRUCTURE_PATTERN);
        try {
            let [, name, submitTime, time, guesses, areGuessesPublic] = lineMatch;
            name = name.replace(/\\"/g, '"');
            InMemoryDatabase.addLeader({ date, wordlist, name, guesses, time, submitTime, areGuessesPublic }, true);
        } catch (e) {
            console.error('ERROR: not able to add leader from this line', line);
        }
    });

    console.log(`\tRecovered ${lines.length} leaders from ${fileName}`);
}

module.exports = {
    backupEntry,
    recoverInMemoryDatabaseFromFiles,
    asyncContinueRecovery,
};
