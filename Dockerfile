# SuiteScout — single container. Node 20.
# The database is the shared platform-postgres (Postgres 16) on the
# vivescript-net network. All runtime variables arrive
# via the environment from docker-compose.yml (which reads .env) —
# never baked into the image (.dockerignore excludes .env), and never
# needed at build time: `next build` only imports modules, and every
# env access in lib/ is lazy (first request / first query).
FROM node:20-alpine

WORKDIR /app

# Build tools still needed: better-sqlite3 (native module) is a
# devDependency — only the SQLite→Postgres migration script uses it.
RUN apk add --no-cache python3 make g++

# pnpm — exact pin matching packageManager in package.json.
RUN npm install -g pnpm@12.16.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["pnpm", "start"]
