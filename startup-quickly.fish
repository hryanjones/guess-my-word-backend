#! /usr/bin/fish

set SERVER_PID (sudo netstat -tulpn | grep 443 | grep -Eo '[0-9]+/node' | grep -Eo '[0-9]+')
set PREFIX $argv[1]

if test -z "$PREFIX"
    echo "You must give a prefix to look for in the logs 'Recovered .* leaders from PREFIX'"
end

echo "will kill $SERVER_PID when the server log reaches 'Recovered .* leaders from $PREFIX'"
echo -e "\nmake sure to start the server in another terminal 😉"

for n in (seq 200)
    echo (date)
    sudo tail serverlog | grep -E "Recovered .* leaders from $PREFIX" && sudo kill $SERVER_PID && break
    sleep 1
end