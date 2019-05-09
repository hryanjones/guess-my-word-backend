const timezonelessDateMatcher = /^2[0-1][0-9]{2}-[0-1][0-9]-[0-9]{2}$/
const acceptableLists = ['normal', 'hard']
const wordMatcher = /^[a-z]{2,12}$/ // FIXME get actual longest word from frontend
const maxNameLength = 128
const maxNumberOfGuesses = 200
const maxTime = 24 * 60 * 60 * 1000 // max time is 24 hours

function getInvalidReason(dateString, wordlist, name, time, guesses) {
    if (!timezonelessDateMatcher.test(dateString)) {
        return `Date isn't the correct format, like "2019-04-30". You sent: "${dateString}".`
    }
    if (!acceptableLists.includes(wordlist)) {
        return `wordlist isn't one of known lists: ${acceptableLists.join(', ')}. You gave: ${wordlist}}.`
    }
    if (!name) {
        return 'You must give a name.';
    }
    if (name.length > maxNameLength) {
        return `Name can't be longer than ${maxNameLength}. Yours is ${name.length}.`
    }
    if (!numberIsBetweenRange(time, 0, maxTime)) {
        return `Time must be a positive number less than 24 hours. You gave ${time}ms.`
    }
    const numberOfGuesses = guesses.length;
    if (!numberIsBetweenRange(numberOfGuesses, 0, maxNumberOfGuesses)) {
        return `Number of guesses must be a positive number less than ${maxNumberOfGuesses}. You gave: ${numberOfGuesses} .`
    }
    const firstInvalidWord = guesses.find(g => !wordMatcher.test(g));
    if (firstInvalidWord) {
        return `Found an invalid word in the guesses: ${firstInvalidWord}.`
    }

    const word = guesses.slice(-1)[0];
    const expectedWord = lookupWord(dateString, wordlist);
    if (!expectedWord) {
        return `Didn't find a word for the date (${dateString}) and wordlist (${wordlist}) you gave.`;
    }
    if (word !== expectedWord) {
        return `The last guess isn't the word I was expecting for this day and wordlist. You sent: "${word}".`;
    }

    return ''
}

// FIXME, this is currently just copy-pasted from frontend code, would be much better if we load this from the frontend on startup
const possibleWords = {
    // normal words were from 1-1,000 common English words on TV and movies https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists/TV/2006/1-1000
    normal: /* DON'T LOOK CLOSELY UNLESS YOU WANT TO BE SPOILED!!! */['', '', '', 'course', 'against', 'ready', 'daughter', 'work', 'friends', 'minute', 'though', 'supposed', 'honey', 'point', 'start', 'check', 'alone', 'matter', 'office', 'hospital', 'three', 'already', 'anyway', 'important', 'tomorrow', 'almost', 'later', 'found', 'trouble', 'excuse', 'hello', 'money', 'different', 'between', 'every', 'party', 'either', 'enough', 'year', 'house', 'story', 'crazy', 'mind', 'break', 'tonight', 'person', 'sister', 'pretty', 'trust', 'funny', 'gift', 'change', 'business', 'train', 'under', 'close', 'reason', 'today', 'beautiful', 'brother', 'since', 'bank', 'yourself', 'without', 'until', 'forget', 'anyone', 'promise', 'happy', 'bake', 'worry', 'school', 'afraid', 'cause', 'doctor', 'exactly', 'second', 'phone', 'look', 'feel', 'somebody', 'stuff', 'elephant', 'morning', 'heard', 'world', 'chance', 'call', 'watch', 'whatever', 'perfect', 'dinner', 'family', 'heart', 'least', 'answer', 'woman', 'bring', 'probably', 'question', 'stand', 'truth', 'problem',],

    // hard words were gotten from a top 100 SAT word list https://education.yourdictionary.com/for-students-and-parents/100-most-common-sat-words.html
    hard: /* DON'T LOOK CLOSELY UNLESS YOU WANT TO BE SPOILED!!! */['abdicate', 'empathy', 'abate', 'venerable', 'exemplary', 'hackneyed', 'foster', 'aberration', 'clairvoyant', 'extenuating', 'mundane', 'forbearance', 'fortitude', 'prudent', 'hypothesis', 'ephemeral', 'scrutinize', 'capitulate', 'spurious', 'substantiate', 'intuitive', 'tenacious', 'digression', 'prosperity', 'compromise', 'vindicate', 'fraught', 'submissive', 'ostentatious', 'boisterous', 'bias', 'impetuous', 'wary', 'rancorous', 'deleterious', 'amicable', 'reclusive', 'canny', 'superficial', 'emulate', 'frugal', 'perfidious', 'jubilation', 'brusque', 'intrepid', 'sagacity', 'arid', 'inconsequential', 'nonchalant', 'reconciliation', 'brazen', 'prosaic', 'pretentious', 'benevolent', 'aesthetic', 'adversity', 'abhor', 'divergent', 'fortuitous', 'conditional', 'disdain', 'demagogue', 'asylum', 'compassion', 'hedonist', 'condescending', 'querulous', 'collaborate', 'inevitable', 'discredit', 'renovation', 'lobbyist', 'enervating', 'provocative', 'florid', 'convergence', 'subtle', 'diligent', 'surreptitious', 'orator', 'superfluous', 'opulent', 'capacious', 'tactful', 'longevity', 'restrained', 'conformist', 'abstain', 'pragmatic', 'reverence', 'spontaneous', 'anachronistic', 'haughty', 'procrastinate', 'parched', 'camaraderie', 'precocious', 'evanescent', 'impute', 'transient',],
};

function lookupWord(dateString, wordlist) {
    let [year, month, day] = dateString.split('-').map(str => parseInt(str));
    if (year !== 2019) return;
    const dayOfYear = getDOY(new Date(year, month, day));
    const index = (year - 2019) + dayOfYear - 114;
    const words = possibleWords[wordlist] || [];
    return words[index];
}

function numberIsBetweenRange(number, min, max) {
    return Number.isFinite(number) &&
        number > min &&
        number < max
}

// https://stackoverflow.com/questions/8619879/javascript-calculate-the-day-of-the-year-1-366
function isLeapYear(date) {
    var year = date.getFullYear();
    if ((year & 3) != 0) return false;
    return ((year % 100) != 0 || (year % 400) == 0);
}

// Get Day of Year
function getDOY(date) {
    var dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var mn = date.getMonth();
    var dn = date.getDate();
    var dayOfYear = dayCount[mn] + dn;
    if (mn > 1 && isLeapYear(date)) dayOfYear++;
    return dayOfYear;
};

module.exports = getInvalidReason;