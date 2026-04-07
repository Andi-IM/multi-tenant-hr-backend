#!/bin/sh
set -e

# Default values for GCP Cloud Run (uses port 8080)
: "${PORT:=8080}"
: "${COMPANY_A_SERVICE_URL:=http://company-a:3001}"
: "${COMPANY_B_SERVICE_URL:=http://company-b:3002}"
: "${ATTENDANCE_SERVICE_URL:=http://attendance:3003}"

# Determine DNS resolver and fetch OIDC token based on environment
if [ -n "$K_SERVICE" ]; then
    # GCP Cloud Run environment
    RESOLVER_IP="169.254.169.254"
    
    # Fetch identity token for service-to-service authentication
    # We use the audience of the current project to get a general-purpose token
    echo "Fetching OIDC token from metadata server..."
    OIDC_TOKEN=$(curl -s -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=https://cloud.run")
else
    # Local environment (Docker Compose)
    RESOLVER_IP="127.0.0.11"
    OIDC_TOKEN=""
fi

export COMPANY_A_SERVICE_URL COMPANY_B_SERVICE_URL ATTENDANCE_SERVICE_URL PORT RESOLVER_IP OIDC_TOKEN

# Only substitute specific variables to avoid breaking Nginx $vars
envsubst '${PORT} ${COMPANY_A_SERVICE_URL} ${COMPANY_B_SERVICE_URL} ${ATTENDANCE_SERVICE_URL} ${RESOLVER_IP} ${OIDC_TOKEN}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf


# Start Nginx
exec nginx -g 'daemon off;'

