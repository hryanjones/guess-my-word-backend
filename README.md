# guess-my-word-backend

A backend to https://github.com/hryanjones/guess-my-word to store a leaderboard.

## TODOs

- [ ] Set up log rotation for `serverlog` — the file grew to 1.7GB (2019–2026) before being manually trimmed.
  Consider `logrotate` with a 2-week retention window, or switching to a logging library that supports rotation natively.
