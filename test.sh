#! /bin/bash

# Utility

function error_exit {
    echo "FAIL: $1" >&2   ## Send message to stderr. Exclude >&2 if you don't want it that way.
    exit "${2:-1}"  ## Return a code specified by $2 or 1 by default.
}

# Test validation

curl -s -X POST "localhost:8080/leaderboard/2019-4-30/wordlist/normal?word=netherland&name=goobley&time=2000&numberOfGuesses=2"  | grep -q "Date isn't the correct format"  || error_exit "date format 400"
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/notnormal?word=netherland&name=goobley&time=2000&numberOfGuesses=2" | grep -q "wordlist isn't one of known" || error_exit "wordlist 400"
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?word=Netherland&name=goobley&time=2000&numberOfGuesses=2" | grep -q "Word isn't the correct" || error_exit "Word 400"
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?&name=goobley&time=2000&numberOfGuesses=2" | grep -q "Word isn't the correct" || error_exit "missing word 400"
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?word=netherland&name=1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890&time=2000&numberOfGuesses=2" | grep -q "Name can't be longer" || error_exit "name too long 400"
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?word=netherland&name=goobley&time=86400001&numberOfGuesses=2" | grep -q "Time must be a positive" || error_exit "time too big 400"
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?word=netherland&name=goobley&time=2000&numberOfGuesses=301" | grep -q "NumberOfGuesses must be a positive" || error_exit "too many guesses 400"


# Test storing data 

curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?word=netherland&name=goobley&time=2000&numberOfGuesses=2" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?word=netherland&name=blerg&time=30000&numberOfGuesses=3" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?word=netherland&name=mergen&time=100&numberOfGuesses=1" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?word=netherland&name=purg&time=40&numberOfGuesses=4" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?word=netherland&name=Looben%20Doo&time=5000&numberOfGuesses=5" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?word=netherland&name=Mukilteo👍&time=600&numberOfGuesses=6" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?word=netherland&name=Dublin&time=70000&numberOfGuesses=7" > /dev/null
curl -sv -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?word=netherland&name=Foogey&time=800000&numberOfGuesses=8" | jq

# Test not duplicate users

curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?word=netherland&name=goobley&time=2000&numberOfGuesses=2" | grep -q "is already taken" || error_exit "duplicate name 400"



