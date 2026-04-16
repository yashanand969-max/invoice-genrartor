FROM ghcr.io/puppeteer/puppeteer:latest

USER root
WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install explicit packages 
RUN npm ci

# Copy the server directory logic
COPY . .

# Secure context
USER pptruser

EXPOSE 5000

CMD ["node", "index.js"]
