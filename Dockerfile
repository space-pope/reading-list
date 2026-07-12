FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ src/
RUN npx tsc

COPY static/ static/
RUN npx esbuild static/app.ts --bundle --outfile=static/app.js --format=iife --target=es2020 --minify

COPY src/db/migrations/ dist/db/migrations/
COPY templates/ templates/

ENV READING_LIST_DB_PATH=/data/db.sqlite
ENV READING_LIST_HOST=0.0.0.0
ENV READING_LIST_PORT=3000

RUN mkdir -p /data

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
