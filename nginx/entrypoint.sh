#!/bin/sh
set -e

: "${PORT:=80}"
: "${COMPANY_A_URL:=http://company-a:3001}"
: "${COMPANY_B_URL:=http://company-b:3002}"
: "${ATTENDANCE_URL:=http://attendance:3003}"

envsubst '${PORT} ${COMPANY_A_URL} ${COMPANY_B_URL} ${ATTENDANCE_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
