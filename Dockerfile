FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ src/
RUN npx tsc

COPY templates/ templates/
COPY static/ static/

ENV READING_LIST_DB_PATH=/data/db.sqlite
ENV READING_LIST_HOST=0.0.0.0
ENV READING_LIST_PORT=3000

RUN mkdir -p /data

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
