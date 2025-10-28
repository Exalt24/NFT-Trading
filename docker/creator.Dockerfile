FROM node:22-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

EXPOSE 3001

# Start dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]