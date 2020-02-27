#! /bin/bash

numberBackupFiles=`ls backupLeaderboards | wc -l`
if [ $numberBackupFiles -gt 7 ]; then
    echo "Please:"
    echo "  1. Make sure you're not running the test in PROD"
    echo "  2. delete extra backups with"
    echo "    rm -rf backupLeaderboards/*"
    exit 1
fi

# Pre-Cleanup
## remove backup files & response
rm backupLeaderboards/2019-04-30_normal.csv 2> /dev/null
rm backupLeaderboards/2019-05-01_normal.csv 2> /dev/null
rm backupLeaderboards/2019-05-02_normal.csv 2> /dev/null
rm backupLeaderboards/2019-05-03_normal.csv 2> /dev/null
rm backupLeaderboards/2019-05-04_normal.csv 2> /dev/null
rm backupLeaderboards/2019-05-01_hard.csv 2> /dev/null
rm /tmp/recovery-response.json 2> /dev/null
rm /tmp/response.json 2> /dev/null
rm /tmp/expected.json 2> /dev/null
rm BAD_NAMES.json 2> /dev/null

echo "Cleaned up test files."

# Utility

function error_exit {
    echo "FAIL: $1" >&2   ## Send message to stderr. Exclude >&2 if you don't want it that way.
    if [ $# -gt 1 ]; then
        eval $2
    fi
    kill "$server_pid"
    exit 1
}

nc -zv localhost 8080 2> /dev/null && read -p "The server is running, stop it so the test can start it itself."


node ./index &
server_pid="$!"
sleep 4 # wait for server to start

# Test validation that has a return

## 201 guesses which is above max
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=aa,aah,aahed,aahing,aahs,aal,aalii,aaliis,aals,aardvark,aardvarks,aardwolf,aardwolves,aargh,aarrgh,aarrghh,aarti,aartis,aas,aasvogel,aasvogels,ab,aba,abac,abaca,abacas,abaci,aback,abacs,abacterial,abactinal,abactinally,abactor,abactors,abacus,abacuses,abaft,abaka,abakas,abalone,abalones,abamp,abampere,abamperes,abamps,aband,abanded,abanding,abandon,abandoned,abandonedly,abandonee,abandonees,abandoner,abandoners,abandoning,abandonment,abandonments,abandons,abandonware,abandonwares,abands,abapical,abas,abase,abased,abasedly,abasement,abasements,abaser,abasers,abases,abash,abashed,abashedly,abashes,abashing,abashless,abashment,abashments,abasia,abasias,abasing,abask,abatable,abate,abated,abatement,abatements,abater,abaters,abates,abating,abatis,abatises,abator,abators,abattis,abattises,abattoir,abattoirs,abattu,abature,abatures,abaxial,abaxile,abaya,abayas,abb,abba,abbacies,abbacy,abbas,abbatial,abbe,abbed,abbes,abbess,abbesses,abbey,abbeys,abbot,abbotcies,abbotcy,abbots,abbotship,abbotships,abbreviate,abbreviated,abbreviates,abbreviating,abbreviation,abbreviations,abbreviator,abbreviators,abbreviatory,abbreviature,abbreviatures,abbs,abcee,abcees,abcoulomb,abcoulombs,abdabs,abdicable,abdicant,abdicate,abdicated,abdicates,abdicating,abdication,abdications,abdicative,abdicator,abdicators,abdomen,abdomens,abdomina,abdominal,abdominally,abdominals,abdominoplasty,abdominous,abduce,abduced,abducens,abducent,abducentes,abduces,abducing,abduct,abducted,abductee,abductees,abducting,abduction,abductions,abductor,abductores,abductors,abducts,abeam,abear,abearing,abears,abecedarian,abecedarians,abed,abegging,abeigh,abele,abeles,abelia,abelian,abelias,abelmosk,abelmosks,aberdevine,aberdevines,abernethies,daughter&name=goobley&time=2000" \
    | grep -q "Sorry, the completion board doesn" || error_exit "too many guesses 400"

## name is too long
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=something,daughter&name=1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890&time=2000" \
    | grep -q "Name can't be longer" || error_exit "name too long 400"

## name is too short
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=something,daughter&name=a&time=2000" \
    | grep -q "is too short" || error_exit "name too short 400"

## no word for date
curl -s -X POST "localhost:8080/leaderboard/2018-04-30/wordlist/normal?guesses=blue,daughter&name=goobley&time=2000" \
    | grep -q "Didn't find a word for" || error_exit "no word for date 400"

## not the correct word
curl -Is -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=blue,netherland&name=goobley&time=2000" \
    | grep -q "HTTP/1.1 201" || error_exit "unexpected word 400"

## 201 same guesses and time
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=blue,daughter&name=goobley&time=2000" > /dev/null
curl -Is -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=blue,daughter&name=blue&time=2000" > /dev/null


# Test storing data

curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=acrid,whatever,daughter&name=%22blerg%22&time=30000" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=something,daughter&name=mergen&time=301" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=cry,whimper,fly,daughter&name=purg&time=1140" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=barf,map,food,name,daughter&name=Looben%20Doo&time=5000" > /dev/null
# emoji in name the encoded character is 👍
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=blab,finger,put,shoot,blah,daughter&name=Mukilteo%F0%9F%91%8D&time=600" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=blue,put,shoot,blah,whatever,fly,daughter&name=Dublin&time=70000" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=acrid,whatever,finger,put,shoot,blah,eight,daughter&name=Foogey&time=800000"

curl -s "localhost:8080/leaderboard/ALL/wordlist/normal" > /dev/null # call the all time leaderboard to cache it


## Test output is correct
echo -n '[{"submitTime":"","time":2000,"numberOfGuesses":2,"name":"goobley","awards":"🍀 lucky?"},{"submitTime":"","time":30000,"numberOfGuesses":3,"name":"\"blerg\"","awards":"🍀 lucky?"},{"submitTime":"","time":301,"numberOfGuesses":2,"name":"mergen","awards":"🍀 lucky?"},{"submitTime":"","time":1140,"numberOfGuesses":4,"name":"purg","awards":"🍀 lucky?"},{"submitTime":"","time":5000,"numberOfGuesses":5,"name":"Looben Doo","awards":"🍀 lucky?"},{"submitTime":"","time":600,"numberOfGuesses":6,"name":"Mukilteo👍","awards":"🍀 lucky?"},{"submitTime":"","time":70000,"numberOfGuesses":7,"name":"Dublin","awards":"🏆 fastest, 🏆 fewest guesses, 🏅 first guesser"},{"submitTime":"","time":800000,"numberOfGuesses":8,"name":"Foogey"}]' > /tmp/expected.json
curl -s "localhost:8080/leaderboard/2019-04-30/wordlist/normal" | \
    sed -e 's/"submitTime":"[^"]*"/"submitTime":""/g' \
    > /tmp/response.json  \
    && diff -q /tmp/response.json /tmp/expected.json || error_exit "unexpected JSON response" "meld /tmp/response.json /tmp/expected.json"

# Test not duplicate users
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=something,daughter&name=goobley&time=2000" \
    | grep -q "is already taken" || error_exit "duplicate name 400"

# All Time Leaders
## Add leaders for a different day, same normal list
curl -s -X POST "localhost:8080/leaderboard/2019-05-01/wordlist/normal?guesses=barf,blah,three,work&name=Foogey&time=4000" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-05-01/wordlist/normal?guesses=blue,put,shoot,blah,whatever,fly,something,work&name=Dublin&time=800000" > /dev/null

# Add leaders for a different day, hard list
curl -s -X POST "localhost:8080/leaderboard/2019-05-01/wordlist/hard?guesses=fuck,aberration&name=mergen&time=400&areGuessesPublic=true" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-05-01/wordlist/hard?guesses=cry,whimper,fly,aberration&name=purg&time=401" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-05-01/wordlist/hard?guesses=barf,map,food,name,aberration&name=Looben%20Doo&time=5000" > /dev/null


# Test that guesses come back when correct name and key given

echo -n '[{"submitTime":"","time":400,"guesses":["🙊","aberration"],"numberOfGuesses":2,"name":"mergen","awards":"🍀 lucky?"},{"submitTime":"","time":401,"numberOfGuesses":4,"name":"purg","awards":"🍀 lucky?"},{"submitTime":"","time":5000,"numberOfGuesses":5,"name":"Looben Doo","awards":"🍀 lucky?"}]' > /tmp/expected.json
curl -s "localhost:8080/leaderboard/2019-05-01/wordlist/hard?name=purg&key=cry" | \
    sed -e 's/"submitTime":"[^"]*"/"submitTime":""/g' \
    > /tmp/response.json  \
    && diff -q /tmp/response.json /tmp/expected.json || error_exit "unexpected JSON response for guesses" "meld /tmp/response.json /tmp/expected.json"

# Test that guesses DON'T come back when correct name and incorrect key given

echo -n '[{"submitTime":"","time":400,"numberOfGuesses":2,"name":"mergen","awards":"🍀 lucky?"},{"submitTime":"","time":401,"numberOfGuesses":4,"name":"purg","awards":"🍀 lucky?"},{"submitTime":"","time":5000,"numberOfGuesses":5,"name":"Looben Doo","awards":"🍀 lucky?"}]' > /tmp/expected.json
curl -s "localhost:8080/leaderboard/2019-05-01/wordlist/hard?name=purg&key=bye" | \
    sed -e 's/"submitTime":"[^"]*"/"submitTime":""/g' \
    > /tmp/response.json  \
    && diff -q /tmp/response.json /tmp/expected.json || error_exit "unexpected JSON response for guesses" "meld /tmp/response.json /tmp/expected.json"


# Test getting all time leaderboard data

## Add leaders for a another couple days, players need to have played at least 4 times
curl -s -X POST "localhost:8080/leaderboard/2019-05-02/wordlist/normal?guesses=barf,blah,three,four,friends&name=Foogey&time=5000" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-05-02/wordlist/normal?guesses=blue,put,shoot,blah,whatever,fly,something,eight,friends&name=Dublin&time=900000" > /dev/null

curl -s -X POST "localhost:8080/leaderboard/2019-05-03/wordlist/normal?guesses=barf,blah,three,four,five,minute&name=Foogey&time=6000" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-05-03/wordlist/normal?guesses=blue,put,shoot,blah,whatever,fly,something,eight,nine,minute&name=Dublin&time=1000000" > /dev/null

curl -s -X POST "localhost:8080/leaderboard/2019-05-04/wordlist/normal?guesses=blue,put,shoot,blah,whatever,fly,something,eight,nine,ten,though&name=Dublin&time=1100000" > /dev/null


echo -n '[{"playCount":5,"firstSubmitDate":"","bestTime":70000,"bestNumberOfGuesses":7,"numberOfGuessesMedian":9,"timeMedian":900000,"weeklyPlayRate":7,"name":"Dublin","awards":"🏆👏 highest weekly rate, 🏅 most plays"},{"playCount":4,"firstSubmitDate":"","bestTime":4000,"bestNumberOfGuesses":4,"numberOfGuessesMedian":5,"timeMedian":5000,"weeklyPlayRate":7,"name":"Foogey","awards":"🏆👏 highest weekly rate, 🏆👏 fastest median, 🏆👏 fewest median guesses, 🏆 fastest, 🏆 fewest guesses"}]' > /tmp/expected.json
curl -s "localhost:8080/leaderboard/ALL/wordlist/normal" \
    | sed -e 's/"firstSubmitDate":"[^"]*"/"firstSubmitDate":""/g' \
    > /tmp/response.json \
    && diff -q /tmp/response.json /tmp/expected.json  || error_exit "All time leaderboard data doesn't look right."  "meld /tmp/response.json /tmp/expected.json"

# Test backup files

ls backupLeaderboards/2019-04-30_normal.csv > /dev/null || error_exit "didn't create backup file"

head -n 1 backupLeaderboards/2019-04-30_normal.csv \
    | grep -q "name,submitTime,timeInMilliSeconds,guesses" || error_exit "backup file header isn't correct"

grep -E ',[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z,[0-9]+,"[a-z,]+",(true|false)$' backupLeaderboards/2019-04-30_normal.csv | wc -l | grep -qE "^8$" || error_exit "expected different number of entries in backup file"

## other backup file
head -n 1 backupLeaderboards/2019-05-01_hard.csv \
    | grep -q "name,submitTime,timeInMilliSeconds,guesses,areGuessesPublic" || error_exit "backup file header isn't correct"

grep -E ',[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z,[0-9]+,"[a-z,]+",(true|false)$' backupLeaderboards/2019-05-01_hard.csv | wc -l | grep -qE "^3$" || error_exit "expected different number of entries in 2nd backup file"


# Recovering from backup files

kill "$server_pid"

# test areGuessesPublic can handle data without headers
sed -i  -e 's/,areGuessesPublic$//' -e 's/,true$//' -e 's/,false$//' backupLeaderboards/2019-04-30_normal.csv
node ./index.js &
sleep 3
server_pid="$!"

curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=acrid,whatever,finger,put,shoot,derp,eight,daughter&name=Yeah%20recovery%20worked&time=800000"

echo -n '[{"submitTime":"","time":2000,"numberOfGuesses":2,"name":"goobley","awards":"🍀 lucky?"},{"submitTime":"","time":30000,"numberOfGuesses":3,"name":"\"blerg\"","awards":"🍀 lucky?"},{"submitTime":"","time":301,"numberOfGuesses":2,"name":"mergen","awards":"🍀 lucky?"},{"submitTime":"","time":1140,"numberOfGuesses":4,"name":"purg","awards":"🍀 lucky?"},{"submitTime":"","time":5000,"numberOfGuesses":5,"name":"Looben Doo","awards":"🍀 lucky?"},{"submitTime":"","time":600,"numberOfGuesses":6,"name":"Mukilteo👍","awards":"🍀 lucky?"},{"submitTime":"","time":70000,"numberOfGuesses":7,"name":"Dublin","awards":"🏆 fastest, 🏆 fewest guesses, 🏅 first guesser"},{"submitTime":"","time":800000,"numberOfGuesses":8,"name":"Foogey"},{"submitTime":"","time":800000,"numberOfGuesses":8,"name":"Yeah recovery worked"}]' > /tmp/expected.json
curl -s "localhost:8080/leaderboard/2019-04-30/wordlist/normal" | \
    sed -e 's/"submitTime":"[^"]*"/"submitTime":""/g' > \
    /tmp/response.json && \
    diff -q /tmp/response.json /tmp/expected.json  || error_exit "didn't recover all the data" "meld /tmp/response.json /tmp/expected.json"



## allow existing short name
curl -Is -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=something,daughter&name=R&time=2000" \
    | grep -q "HTTP/1.1 201" || error_exit "date format 201"


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


echo "NOTE: If you want to run the max number of leaders test, uncomment it (it takes a long time)."

# # Max number of leaders
# for LEADER in {5..19999}; do
#     curl -s -X POST "localhost:8080/leaderboard/2019-05-01/wordlist/hard?guesses=barf,map,food,name,aberration&name=${LEADER}&time=5000" > /dev/null
#     if ! (( $LEADER % 200 )) ; then
#         echo "just sent leader ${LEADER}"
#     fi
# done

# ## Last acceptable leader should have normal output
# curl -Is -X POST "localhost:8080/leaderboard/2019-05-01/wordlist/hard?guesses=barf,map,food,name,aberration&name=20000&time=5000" | grep -q "HTTP/1.1 201" || error_exit "didn't accept the last leader"


# ## Leader after max should be rejected.
# curl -s -X POST "localhost:8080/leaderboard/2019-05-01/wordlist/hard?guesses=barf,map,food,name,aberration&name=20000&time=5000" | grep -q "Sorry, we only accept" || error_exit "Didn't reject over-max leader"


# Bad Names test

## make 3 reports for goobley
curl -s -H "Content-Type: application/json" --data '{"reporterName":"mergen", "badName":"goobley"}' -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal/badname" > /dev/null
curl -s -H "Content-Type: application/json" --data '{"reporterName":"purg", "badName":"goobley"}' -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal/badname" > /dev/null
curl -s -H "Content-Type: application/json" --data '{"reporterName":"Mukilteo👍", "badName":"goobley"}' -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal/badname" > /dev/null

echo -n '[{"submitTime":"","time":2000,"numberOfGuesses":2,"name":"goobley","awards":"🍀 lucky?","badName":true},{"submitTime":"","time":30000,"numberOfGuesses":3,"name":"\"blerg\"","awards":"🍀 lucky?"},{"submitTime":"","time":301,"numberOfGuesses":2,"name":"mergen","awards":"🍀 lucky?"},{"submitTime":"","time":1140,"numberOfGuesses":4,"name":"purg","awards":"🍀 lucky?"},{"submitTime":"","time":5000,"numberOfGuesses":5,"name":"Looben Doo","awards":"🍀 lucky?"},{"submitTime":"","time":600,"numberOfGuesses":6,"name":"Mukilteo👍","awards":"🍀 lucky?"},{"submitTime":"","time":70000,"numberOfGuesses":7,"name":"Dublin","awards":"🏆 fastest, 🏆 fewest guesses, 🏅 first guesser"},{"submitTime":"","time":800000,"numberOfGuesses":8,"name":"Foogey"},{"submitTime":"","time":800000,"numberOfGuesses":8,"name":"Yeah recovery worked"},{"submitTime":"","time":2000,"numberOfGuesses":2,"name":"R","awards":"🍀 lucky?"}]' > /tmp/expected.json
curl -s "localhost:8080/leaderboard/2019-04-30/wordlist/normal" \
    | sed -e 's/"submitTime":"[^"]*"/"submitTime":""/g' \
    > /tmp/response.json\
    && diff -q /tmp/response.json /tmp/expected.json \
    || error_exit "didn't correctly apply badName from 3 reports" "meld /tmp/response.json /tmp/expected.json"

## Bad names recovery test

kill "$server_pid"
node ./index.js &
sleep 3
server_pid="$!"

echo -n '[{"submitTime":"","time":2000,"numberOfGuesses":2,"name":"goobley","awards":"🍀 lucky?","badName":true},{"submitTime":"","time":30000,"numberOfGuesses":3,"name":"\"blerg\"","awards":"🍀 lucky?"},{"submitTime":"","time":301,"numberOfGuesses":2,"name":"mergen","awards":"🍀 lucky?"},{"submitTime":"","time":1140,"numberOfGuesses":4,"name":"purg","awards":"🍀 lucky?"},{"submitTime":"","time":5000,"numberOfGuesses":5,"name":"Looben Doo","awards":"🍀 lucky?"},{"submitTime":"","time":600,"numberOfGuesses":6,"name":"Mukilteo👍","awards":"🍀 lucky?"},{"submitTime":"","time":70000,"numberOfGuesses":7,"name":"Dublin","awards":"🏆 fastest, 🏆 fewest guesses, 🏅 first guesser"},{"submitTime":"","time":800000,"numberOfGuesses":8,"name":"Foogey"},{"submitTime":"","time":800000,"numberOfGuesses":8,"name":"Yeah recovery worked"},{"submitTime":"","time":2000,"numberOfGuesses":2,"name":"R","awards":"🍀 lucky?"}]' > /tmp/expected.json
curl -s "localhost:8080/leaderboard/2019-04-30/wordlist/normal" \
    | sed -e 's/"submitTime":"[^"]*"/"submitTime":""/g' \
    > /tmp/response.json\
    && diff -q /tmp/response.json /tmp/expected.json \
    || error_exit "wasn't able to recover bad names from backup" "meld /tmp/response.json /tmp/expected.json"

kill "$server_pid"

echo "Good job, it works! 👍"

# Cleanup
## remove backup files & repsonse
rm backupLeaderboards/2019-04-30_normal.csv
rm backupLeaderboards/2019-05-01_normal.csv
rm backupLeaderboards/2019-05-02_normal.csv
rm backupLeaderboards/2019-05-03_normal.csv
rm backupLeaderboards/2019-05-04_normal.csv
rm backupLeaderboards/2019-05-01_hard.csv
rm /tmp/response.json
rm /tmp/expected.json
rm BAD_NAMES.json
