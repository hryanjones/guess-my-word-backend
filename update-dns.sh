#!/usr/bin/env bash
#
# update-dns.sh
#
# Checks if the machine's current public IP matches the Route53 A record for
# ec2.hryanjones.com and updates it if not.
#
# Runs every 5 minutes via cron (see crontab -l).
# Logs to cron.log in the same directory.

set -euo pipefail

DOMAIN="ec2.hryanjones.com"
HOSTED_ZONE_ID="Z1L7H93RRK1ASV"
AWS_PROFILE="cloudwatchput"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

CURRENT_IP=$(curl -sf https://ifconfig.me || curl -sf https://checkip.amazonaws.com || true)
if [ -z "$CURRENT_IP" ]; then
    log "ERROR: Could not determine current public IP. Skipping."
    exit 1
fi

ROUTE53_IP=$(aws route53 list-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --profile "$AWS_PROFILE" \
    --query "ResourceRecordSets[?Name=='${DOMAIN}.'].ResourceRecords[0].Value" \
    --output text 2>/dev/null || true)

if [ "$CURRENT_IP" = "$ROUTE53_IP" ]; then
    log "OK: $DOMAIN is $CURRENT_IP (no update needed)"
    exit 0
fi

log "UPDATE: $DOMAIN is $ROUTE53_IP in Route53 but current IP is $CURRENT_IP — updating..."

CHANGE_BATCH=$(jq -n \
    --arg domain "$DOMAIN." \
    --arg ip "$CURRENT_IP" \
    '{
        Comment: "Automatic IP update",
        Changes: [{
            Action: "UPSERT",
            ResourceRecordSet: {
                Name: $domain,
                Type: "A",
                TTL: 180,
                ResourceRecords: [{ Value: $ip }]
            }
        }]
    }')

aws route53 change-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --profile "$AWS_PROFILE" \
    --change-batch "$CHANGE_BATCH" \
    --output text > /dev/null

log "DONE: Updated $DOMAIN to $CURRENT_IP"
