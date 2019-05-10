const fs = require('fs');

/*
```
var stream = fs.createWriteStream("append.txt", {flags:'a'});
console.log(new Date().toISOString());
[...Array(10000)].forEach( function (item,index) {
    stream.write(index + "\n");
});
console.log(new Date().toISOString());
stream.end();
```

*/

const backupFileStreamsByDateAndWordlist = {};

function backupToFile({ date, wordlist, name, submitTime, time, guesses }) {
    const data = [sanitizeName(name), submitTime, time, quote(guesses)];
    const stream = getStream(date, wordlist);
    stream.write(`${data.join(',')}\n`);
}

function sanitizeName(name) {
    return quote(name.replace(/"/g, '\\"'));
}

function quote(string) {
    return `"${string}"`;
}

const backupFileHeader = 'name,submitTime,timeInMilliSeconds,guesses\n';

function getStream(date, wordlist) {
    if (!backupFileStreamsByDateAndWordlist[date]) {
        backupFileStreamsByDateAndWordlist[date] = {};
    }

    let stream = backupFileStreamsByDateAndWordlist[date][wordlist];
    if (stream) return stream;

    const filename = `backupLeaderboards/${date}_${wordlist}.csv`;
    const fileAlreadyExists = fs.existsSync(filename);
    stream = fs.createWriteStream(filename, { flags: 'a' });
    if (!fileAlreadyExists) {
        stream.write(backupFileHeader);
    }
    backupFileStreamsByDateAndWordlist[date][wordlist] = stream;

    return stream;
}

module.exports = backupToFile;
