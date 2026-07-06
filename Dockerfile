# Build stage
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Run stage
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist

# Create a data directory for mounting a persistent disk volume
RUN mkdir -p /app/data
ENV DATA_STORE_PATH=/app/data/data-store.json

EXPOSE 3000
CMD ["npm", "start"]
