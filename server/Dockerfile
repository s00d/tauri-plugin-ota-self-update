FROM node:20-alpine

WORKDIR /app

COPY ota-server.cjs /app/ota-server.cjs

ENV PORT=8080
ENV OTA_DATA_DIR=/data/ota

VOLUME ["/data/ota"]

EXPOSE 8080

CMD ["node", "/app/ota-server.cjs"]
