FROM node:20-slim

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev && npm cache clean --force

COPY server.js .

EXPOSE 9000

ENV WHISPER_MODEL=Xenova/whisper-base.en

CMD ["node", "server.js"]
