#! /bin/bash


# Pre-Cleanup
## remove backup files & repsonse
rm backupLeaderboards/2019-04-30_normal.csv 2> /dev/null
rm backupLeaderboards/2019-05-01_normal.csv 2> /dev/null
rm backupLeaderboards/2019-05-02_normal.csv 2> /dev/null
rm backupLeaderboards/2019-05-03_normal.csv 2> /dev/null
rm backupLeaderboards/2019-05-04_normal.csv 2> /dev/null
rm backupLeaderboards/2019-05-01_hard.csv 2> /dev/null
rm /tmp/recovery-response.json 2> /dev/null
rm /tmp/response.json 2> /dev/null
rm /tmp/expected.json 2> /dev/null

read -p "Cleaned up files, stop & start the server if this isn't the first test."

# Utility

function error_exit {
    echo "FAIL: $1" >&2   ## Send message to stderr. Exclude >&2 if you don't want it that way.
    exit "${2:-1}"  ## Return a code specified by $2 or 1 by default.
}

nc -zv localhost 8080 2> /dev/null || error_exit "looks like the server isn't running. Did you start it with node index.js ?"

# Test validation that has a return

## 201 guesses which is above max
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=aa,aah,aahed,aahing,aahs,aal,aalii,aaliis,aals,aardvark,aardvarks,aardwolf,aardwolves,aargh,aarrgh,aarrghh,aarti,aartis,aas,aasvogel,aasvogels,ab,aba,abac,abaca,abacas,abaci,aback,abacs,abacterial,abactinal,abactinally,abactor,abactors,abacus,abacuses,abaft,abaka,abakas,abalone,abalones,abamp,abampere,abamperes,abamps,aband,abanded,abanding,abandon,abandoned,abandonedly,abandonee,abandonees,abandoner,abandoners,abandoning,abandonment,abandonments,abandons,abandonware,abandonwares,abands,abapical,abas,abase,abased,abasedly,abasement,abasements,abaser,abasers,abases,abash,abashed,abashedly,abashes,abashing,abashless,abashment,abashments,abasia,abasias,abasing,abask,abatable,abate,abated,abatement,abatements,abater,abaters,abates,abating,abatis,abatises,abator,abators,abattis,abattises,abattoir,abattoirs,abattu,abature,abatures,abaxial,abaxile,abaya,abayas,abb,abba,abbacies,abbacy,abbas,abbatial,abbe,abbed,abbes,abbess,abbesses,abbey,abbeys,abbot,abbotcies,abbotcy,abbots,abbotship,abbotships,abbreviate,abbreviated,abbreviates,abbreviating,abbreviation,abbreviations,abbreviator,abbreviators,abbreviatory,abbreviature,abbreviatures,abbs,abcee,abcees,abcoulomb,abcoulombs,abdabs,abdicable,abdicant,abdicate,abdicated,abdicates,abdicating,abdication,abdications,abdicative,abdicator,abdicators,abdomen,abdomens,abdomina,abdominal,abdominally,abdominals,abdominoplasty,abdominous,abduce,abduced,abducens,abducent,abducentes,abduces,abducing,abduct,abducted,abductee,abductees,abducting,abduction,abductions,abductor,abductores,abductors,abducts,abeam,abear,abearing,abears,abecedarian,abecedarians,abed,abegging,abeigh,abele,abeles,abelia,abelian,abelias,abelmosk,abelmosks,aberdevine,aberdevines,abernethies,daughter&name=goobley&time=2000" \
    | grep -q "Sorry, the completion board doesn" || error_exit "too many guesses 400"

## name is too long
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=something,daughter&name=1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890&time=2000" \
    | grep -q "Name can't be longer" || error_exit "name too long 400"

## no word for date
curl -s -X POST "localhost:8080/leaderboard/2018-04-30/wordlist/normal?guesses=blue,daughter&name=goobley&time=2000" \
    | grep -q "Didn't find a word for" || error_exit "no word for date 400"


# Test validation that fails silently

curl -Is -X POST "localhost:8080/leaderboard/2019-4-30/wordlist/normal?guesses=something,daughter&name=goobley&time=2000" | grep -q "HTTP/1.1 201" || error_exit "date format 201"

curl -Is -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/notnormal?guesses=something,daughter&name=goobley&time=2000" \
    | grep -q "HTTP/1.1 201" || error_exit "wordlist 201"

## no name given
curl -Is -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=something,daughter&time=2000" \
    | grep -q "HTTP/1.1 201" || error_exit "missing name 201"

## over 24 hours time
curl -Is -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=something,daughter&name=goobley&time=86400001" \
    | grep -q "HTTP/1.1 201" || error_exit "time too big 201"

curl -Is -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=daughter&name=goobley&time=1" \
    | grep -q "HTTP/1.1 201" || error_exit "only one guess 201"

## not the correct word
curl -Is -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=blue,netherland&name=goobley&time=2000" \
    | grep -q "HTTP/1.1 201" || error_exit "unexpected word 400"


# Test storing data

curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=blue,daughter&name=goobley&time=2000" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=acrid,whatever,daughter&name=%22blerg%22&time=30000" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=something,daughter&name=mergen&time=301" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=cry,whimper,fly,daughter&name=purg&time=1140" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=barf,map,food,name,daughter&name=Looben%20Doo&time=5000" > /dev/null
# emoji in name the encoded character is 👍
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=blab,finger,put,shoot,blah,daughter&name=Mukilteo%F0%9F%91%8D&time=600" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=blue,put,shoot,blah,whatever,fly,daughter&name=Dublin&time=70000" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=acrid,whatever,finger,put,shoot,blah,eight,daughter&name=Foogey&time=800000"

## Test output is correct
curl -s "localhost:8080/leaderboard/2019-04-30/wordlist/normal" | \
    sed -e 's/"submitTime":"[^"]*"/"submitTime":""/g' | \
    tee /tmp/response.json | \
    grep -q '{"goobley":{"submitTime":"","time":2000,"numberOfGuesses":2},"\\"blerg\\"":{"submitTime":"","time":30000,"numberOfGuesses":3},"mergen":{"submitTime":"","time":301,"numberOfGuesses":2},"purg":{"submitTime":"","time":1140,"numberOfGuesses":4},"Looben Doo":{"submitTime":"","time":5000,"numberOfGuesses":5},"Mukilteo👍":{"submitTime":"","time":600,"numberOfGuesses":6},"Dublin":{"submitTime":"","time":70000,"numberOfGuesses":7},"Foogey":{"submitTime":"","time":800000,"numberOfGuesses":8}}' || error_exit "unexpected JSON response, compare with /tmp/response.json"

# Test not duplicate users
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=something,daughter&name=goobley&time=2000" \
    | grep -q "is already taken" || error_exit "duplicate name 400"

# All Time Leaders
## Add leaders for a different day, same normal list
curl -s -X POST "localhost:8080/leaderboard/2019-05-01/wordlist/normal?guesses=barf,blah,three,work&name=Foogey&time=4000" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-05-01/wordlist/normal?guesses=blue,put,shoot,blah,whatever,fly,something,work&name=Dublin&time=800000" > /dev/null

curl -s "localhost:8080/leaderboard/ALL/wordlist/normal" | jq -c "[.Foogey,.Dublin]" | grep -q '[{"time":4000,"numberOfGuesses":4,"playCount":2},{"time":70000,"numberOfGuesses":7,"playCount":2}]'|| error_exit "didn't get expected response for all leaderboard"

# Add leaders for a different day, hard list
curl -s -X POST "localhost:8080/leaderboard/2019-05-01/wordlist/hard?guesses=something,aberration&name=mergen&time=400" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-05-01/wordlist/hard?guesses=cry,whimper,fly,aberration&name=purg&time=401" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-05-01/wordlist/hard?guesses=barf,map,food,name,aberration&name=Looben%20Doo&time=5000" > /dev/null

# Test getting all time leaderboard data

## Add leaders for a another couple days, players need to have played at least 3 times
curl -s -X POST "localhost:8080/leaderboard/2019-05-02/wordlist/normal?guesses=barf,blah,three,four,friends&name=Foogey&time=5000" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-05-02/wordlist/normal?guesses=blue,put,shoot,blah,whatever,fly,something,eight,friends&name=Dublin&time=900000" > /dev/null

curl -s -X POST "localhost:8080/leaderboard/2019-05-03/wordlist/normal?guesses=barf,blah,three,four,five,minute&name=Foogey&time=6000" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-05-03/wordlist/normal?guesses=blue,put,shoot,blah,whatever,fly,something,eight,nine,minute&name=Dublin&time=1000000" > /dev/null

curl -s -X POST "localhost:8080/leaderboard/2019-05-04/wordlist/normal?guesses=blue,put,shoot,blah,whatever,fly,something,eight,nine,ten,though&name=Dublin&time=1100000" > /dev/null


echo -n '{"Dublin":{"playCount":5,"firstSubmitDate":"","bestTime":70000,"bestNumberOfGuesses":7,"numberOfGuessesMedian":9,"timeMedian":900000,"weeklyPlayRate":7},"Foogey":{"playCount":4,"firstSubmitDate":"","bestTime":4000,"bestNumberOfGuesses":4,"numberOfGuessesMedian":5,"timeMedian":5000,"weeklyPlayRate":7}}' > /tmp/expected.json
curl -s "localhost:8080/leaderboard/ALL/wordlist/normal" \
    | sed -e 's/"firstSubmitDate":"[^"]*"/"firstSubmitDate":""/g' \
    > /tmp/response.json \
    && diff -q /tmp/response.json /tmp/expected.json  || error_exit "All time leaderboard data doesn't look right. \$ meld /tmp/response.json /tmp/expected.json"

# Test backup files

ls backupLeaderboards/2019-04-30_normal.csv > /dev/null || error_exit "didn't create backup file"

head -n 1 backupLeaderboards/2019-04-30_normal.csv \
    | grep -q "name,submitTime,timeInMilliSeconds,guesses" || error_exit "backup file header isn't correct"

grep -E ',[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z,[0-9]+,"[a-z,]+"$' backupLeaderboards/2019-04-30_normal.csv | wc -l | grep -qE "^8$" || error_exit "expected different number of entries in backup file"

## other backup file
head -n 1 backupLeaderboards/2019-05-01_hard.csv \
    | grep -q "name,submitTime,timeInMilliSeconds,guesses" || error_exit "backup file header isn't correct"

grep -E ',[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z,[0-9]+,"[a-z,]+"$' backupLeaderboards/2019-05-01_hard.csv | wc -l | grep -qE "^3$" || error_exit "expected different number of entries in 2nd backup file"


# Recovering from backup files

read -p "Stop the server, start it agan, then push enter to run recovery test"

curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=acrid,whatever,finger,put,shoot,blah,eight,daughter&name=Yeah%20recovery%20worked&time=800000"

echo -n '{"goobley":{"submitTime":"","time":2000,"numberOfGuesses":2},"\"blerg\"":{"submitTime":"","time":30000,"numberOfGuesses":3},"mergen":{"submitTime":"","time":301,"numberOfGuesses":2},"purg":{"submitTime":"","time":1140,"numberOfGuesses":4},"Looben Doo":{"submitTime":"","time":5000,"numberOfGuesses":5},"Mukilteo👍":{"submitTime":"","time":600,"numberOfGuesses":6},"Dublin":{"submitTime":"","time":70000,"numberOfGuesses":7},"Foogey":{"submitTime":"","time":800000,"numberOfGuesses":8},"Yeah recovery worked":{"submitTime":"","time":800000,"numberOfGuesses":8}}' > /tmp/expected.json
curl -s "localhost:8080/leaderboard/2019-04-30/wordlist/normal" | \
    sed -e 's/"submitTime":"[^"]*"/"submitTime":""/g' > \
    /tmp/recovery-response.json && \
    diff -q /tmp/recovery-response.json /tmp/expected.json  || error_exit "didn't recover all the data, \$ meld /tmp/recovery-response.json /tmp/expected.json "



# Max number of leaders
for LEADER in {4..19999}; do
    curl -s -X POST "localhost:8080/leaderboard/2019-05-01/wordlist/hard?guesses=barf,map,food,name,aberration&name=${LEADER}&time=5000" > /dev/null
    if ! (( $LEADER % 200 )) ; then
        echo "just sent leader ${LEADER}"
    fi
done

## Last acceptable leader should have normal output
curl -Is -X POST "localhost:8080/leaderboard/2019-05-01/wordlist/hard?guesses=barf,map,food,name,aberration&name=20000&time=5000" | grep -q "HTTP/1.1 201" || error_exit "didn't accept the last leader"


## Leader after max should be rejected.
curl -s -X POST "localhost:8080/leaderboard/2019-05-01/wordlist/hard?guesses=barf,map,food,name,aberration&name=20000&time=5000" | grep -q "Sorry, we only accept" || error_exit "Didn't reject over-max leader"


# Cleanup
## remove backup files & repsonse
rm backupLeaderboards/2019-04-30_normal.csv
rm backupLeaderboards/2019-05-01_normal.csv
rm backupLeaderboards/2019-05-02_normal.csv
rm backupLeaderboards/2019-05-03_normal.csv
rm backupLeaderboards/2019-05-04_normal.csv
rm backupLeaderboards/2019-05-01_hard.csv
rm /tmp/recovery-response.json
rm /tmp/response.json
rm /tmp/expected.json

echo
echo "Good job, it works! 👍"