FROM ghcr.io/puppeteer/puppeteer:latest

# Switch to root to copy files
USER root
WORKDIR /app

# Skip Puppeteer's bundled Chrome download — the Docker image already has Chrome installed
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Copy package configurations from the server app
COPY invoice-app/server/package*.json ./

# Install packages
RUN npm ci

# Copy the actual backend code to the current working dir (/app)
COPY invoice-app/server/ .

# Switch back to the safe puppeteer user
USER pptruser

EXPOSE 5000

CMD ["node", "index.js"]
