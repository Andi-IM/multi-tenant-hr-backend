#!/bin/sh
set -e

# Default values for local development (Docker Compose)
# Mapping old variable names to new ones for compatibility
: "${COMPANY_A_SERVICE_URL:=${COMPANY_A_URL:-http://company-a:3001}}"
: "${COMPANY_B_SERVICE_URL:=${COMPANY_B_URL:-http://company-b:3002}}"
: "${ATTENDANCE_SERVICE_URL:=${ATTENDANCE_URL:-http://attendance:3003}}"
: "${PORT:=80}"

export COMPANY_A_SERVICE_URL COMPANY_B_SERVICE_URL ATTENDANCE_SERVICE_URL PORT

# Only substitute specific variables to avoid breaking Nginx $vars
envsubst '${PORT} ${COMPANY_A_SERVICE_URL} ${COMPANY_B_SERVICE_URL} ${ATTENDANCE_SERVICE_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start Nginx
exec nginx -g 'daemon off;'
