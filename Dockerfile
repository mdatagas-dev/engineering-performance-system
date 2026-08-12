# Multi-stage: deps -> build (standalone) -> runner non-root.
#
# Prisma 7 + generator "prisma-client" menghasilkan client TS yang dikompilasi
# ke bundle Next saat build; @prisma/adapter-pg (driver) tanpa query engine
# binary. Karena itu runner TIDAK butuh `prisma generate` maupun node_modules
# prisma — cukup generate sekali di stage build, bundle Next membawa client.
# (Kalau kelak pindah ke generator default dgn engine binary, tambahkan
#  `npx prisma generate` + salin engine di runner — lihat prisma/schema.prisma.)

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
ENV NODE_ENV=production
ENV PORT=3030
ENV HOSTNAME=0.0.0.0
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3030
CMD ["node", "server.js"]
