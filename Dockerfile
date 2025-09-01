# Use Node LTS
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies first (leverage Docker layer caching)
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copy app source
COPY . .

# Expose port
EXPOSE 3000

# Default command (can be overridden by docker-compose)
CMD ["npm", "run", "dev"]
