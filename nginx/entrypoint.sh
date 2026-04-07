#!/bin/sh
set -e

# Default values for GCP Cloud Run (uses port 8080)
: "${PORT:=8080}"
: "${COMPANY_A_SERVICE_URL:=http://company-a:3001}"
: "${COMPANY_B_SERVICE_URL:=http://company-b:3002}"
: "${ATTENDANCE_SERVICE_URL:=http://attendance:3003}"

export COMPANY_A_SERVICE_URL COMPANY_B_SERVICE_URL ATTENDANCE_SERVICE_URL PORT

# Only substitute specific variables to avoid breaking Nginx $vars
envsubst '${PORT} ${COMPANY_A_SERVICE_URL} ${COMPANY_B_SERVICE_URL} ${ATTENDANCE_SERVICE_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start Nginx
exec nginx -g 'daemon off;'
