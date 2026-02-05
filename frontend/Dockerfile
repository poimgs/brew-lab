FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/dist ./dist
CMD ["cp", "-r", "/app/dist/.", "/dist/"]
