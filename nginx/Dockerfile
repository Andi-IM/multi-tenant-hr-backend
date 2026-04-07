FROM nginx:alpine

# Install gettext to enable envsubst
RUN apk add --no-cache gettext

# Copy Nginx configuration files
COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY auth.js /etc/nginx/auth.js
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

# Use the same port as defined in Terraform (8080)
EXPOSE 8080

# The entrypoint script handles the environment variable substitution
CMD ["/entrypoint.sh"]
