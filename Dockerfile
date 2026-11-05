# SuiteScout — single container. Node 20 + native build tools for better-sqlite3.
FROM node:20-alpine

WORKDIR /app

# Build tools needed to compile better-sqlite3 (native module).
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV DATABASE_URL=/app/data/suitescout.db
ENV PORT=3000

VOLUME ["/app/data"]
EXPOSE 3000

CMD ["npm", "start"]
