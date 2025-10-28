FROM node:22-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 8545
# Compile at startup, then run node
CMD ["sh", "-c", "npx hardhat compile && npx hardhat node --hostname 0.0.0.0 --chain-id 31338"]