#! /bin/bash

# Utility

function error_exit {
    echo "FAIL: $1" >&2   ## Send message to stderr. Exclude >&2 if you don't want it that way.
    exit "${2:-1}"  ## Return a code specified by $2 or 1 by default.
}

nc -zv localhost 8080 2> /dev/null || error_exit "looks like the server isn't running. Did you start it with node index.js ?"

# Test validation

curl -s -X POST "localhost:8080/leaderboard/2019-4-30/wordlist/normal?guesses=either&name=goobley&time=2000" \
    | grep -q "Date isn't the correct format"  || error_exit "date format 400"

curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/notnormal?guesses=either&name=goobley&time=2000" \
    | grep -q "wordlist isn't one of known" || error_exit "wordlist 400"

## no name given
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=either&time=2000" \
    | grep -q "must give a name" || error_exit "missing name 400"

## name is too long
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=either&name=1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890&time=2000" \
    | grep -q "Name can't be longer" || error_exit "name too long 400"

## over 24 hours time
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=either&name=goobley&time=86400001" \
    | grep -q "Time must be a positive" || error_exit "time too big 400"

## 201 guesses which is above max
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=aa,aah,aahed,aahing,aahs,aal,aalii,aaliis,aals,aardvark,aardvarks,aardwolf,aardwolves,aargh,aarrgh,aarrghh,aarti,aartis,aas,aasvogel,aasvogels,ab,aba,abac,abaca,abacas,abaci,aback,abacs,abacterial,abactinal,abactinally,abactor,abactors,abacus,abacuses,abaft,abaka,abakas,abalone,abalones,abamp,abampere,abamperes,abamps,aband,abanded,abanding,abandon,abandoned,abandonedly,abandonee,abandonees,abandoner,abandoners,abandoning,abandonment,abandonments,abandons,abandonware,abandonwares,abands,abapical,abas,abase,abased,abasedly,abasement,abasements,abaser,abasers,abases,abash,abashed,abashedly,abashes,abashing,abashless,abashment,abashments,abasia,abasias,abasing,abask,abatable,abate,abated,abatement,abatements,abater,abaters,abates,abating,abatis,abatises,abator,abators,abattis,abattises,abattoir,abattoirs,abattu,abature,abatures,abaxial,abaxile,abaya,abayas,abb,abba,abbacies,abbacy,abbas,abbatial,abbe,abbed,abbes,abbess,abbesses,abbey,abbeys,abbot,abbotcies,abbotcy,abbots,abbotship,abbotships,abbreviate,abbreviated,abbreviates,abbreviating,abbreviation,abbreviations,abbreviator,abbreviators,abbreviatory,abbreviature,abbreviatures,abbs,abcee,abcees,abcoulomb,abcoulombs,abdabs,abdicable,abdicant,abdicate,abdicated,abdicates,abdicating,abdication,abdications,abdicative,abdicator,abdicators,abdomen,abdomens,abdomina,abdominal,abdominally,abdominals,abdominoplasty,abdominous,abduce,abduced,abducens,abducent,abducentes,abduces,abducing,abduct,abducted,abductee,abductees,abducting,abduction,abductions,abductor,abductores,abductors,abducts,abeam,abear,abearing,abears,abecedarian,abecedarians,abed,abegging,abeigh,abele,abeles,abelia,abelian,abelias,abelmosk,abelmosks,aberdevine,aberdevines,abernethies,either&name=goobley&time=2000" \
    | grep -q "Number of guesses must be a positive" || error_exit "too many guesses 400"

## no word for date
curl -s -X POST "localhost:8080/leaderboard/2018-04-30/wordlist/normal?guesses=blue,either&name=goobley&time=2000" \
    | grep -q "Didn't find a word for" || error_exit "no word for date 400"

## not the correct word
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=blue,netherland&name=goobley&time=2000" \
    | grep -q "The last guess isn't the word I was expecting" || error_exit "unexpected word 400"

# Test storing data 

curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=blue,either&name=goobley&time=2000" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=acrid,whatever,either&name=blerg&time=30000" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=either&name=mergen&time=100" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=cry,whimper,fly,either&name=purg&time=40" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=barf,map,food,name,either&name=Looben%20Doo&time=5000" > /dev/null
# emoji in name the encoded character is 👍
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=blab,finger,put,shoot,blah,either&name=Mukilteo%F0%9F%91%8D&time=600" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=blue,put,shoot,blah,whatever,fly,either&name=Dublin&time=70000" > /dev/null
curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=acrid,whatever,finger,put,shoot,blah,eight,either&name=Foogey&time=800000" | jq

# Test not duplicate users

curl -s -X POST "localhost:8080/leaderboard/2019-04-30/wordlist/normal?guesses=either&name=goobley&time=2000" \
    | grep -q "is already taken" || error_exit "duplicate name 400"



