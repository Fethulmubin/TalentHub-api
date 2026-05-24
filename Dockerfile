FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma/ ./prisma/
COPY src/ ./src/
COPY modules/ ./modules/
COPY shared/ ./shared/
COPY services/ ./services/
COPY workers/ ./workers/
COPY websocket/ ./websocket/
COPY utils/ ./utils/

RUN npx prisma generate
RUN npx tsc

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 talenthub

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

USER talenthub

EXPOSE 3500

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
