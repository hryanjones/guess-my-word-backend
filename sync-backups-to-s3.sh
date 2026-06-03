#!/bin/bash
# Syncs backupLeaderboards/ to S3. Safe to run repeatedly — only uploads new/changed files.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
S3_PATH="s3://hryanjones.com/guess-my-word-backend/backupLeaderboards/"

aws s3 sync "$SCRIPT_DIR/backupLeaderboards/" "$S3_PATH" \
    --profile gmw-backup-sync \
    --exclude "*" --include "*.csv" \
    >> "$SCRIPT_DIR/cron.log" 2>&1
