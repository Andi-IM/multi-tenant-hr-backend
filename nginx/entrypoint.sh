#!/bin/sh
set -e

# Default values for GCP Cloud Run (uses port 8080)
: "${PORT:=8080}"
: "${COMPANY_A_SERVICE_URL:=http://company-a:3001}"
: "${COMPANY_B_SERVICE_URL:=http://company-b:3002}"
: "${ATTENDANCE_SERVICE_URL:=http://attendance:3003}"

# Determine DNS resolver based on environment
if echo "$COMPANY_A_SERVICE_URL" | grep -q "\.a\.run\.internal"; then
    # GCP Serverless VPC Access / Cloud Run Internal DNS
    RESOLVER_IP="169.254.169.254"
else
    # Local Docker Compose DNS
    RESOLVER_IP="127.0.0.11"
fi

export COMPANY_A_SERVICE_URL COMPANY_B_SERVICE_URL ATTENDANCE_SERVICE_URL PORT RESOLVER_IP

# Only substitute specific variables to avoid breaking Nginx $vars
envsubst '${PORT} ${COMPANY_A_SERVICE_URL} ${COMPANY_B_SERVICE_URL} ${ATTENDANCE_SERVICE_URL} ${RESOLVER_IP}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start Nginx
exec nginx -g 'daemon off;'

