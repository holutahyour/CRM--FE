# Stage 1: build the Next.js app
FROM node:20-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* values are inlined into the client bundle at build time,
# so they must be present here, not only at runtime.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_DISABLE_MOCK_DATA=true
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_DISABLE_MOCK_DATA=$NEXT_PUBLIC_DISABLE_MOCK_DATA

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./

EXPOSE 3000
CMD ["npm", "start"]
