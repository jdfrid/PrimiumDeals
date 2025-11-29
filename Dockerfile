# Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Production
FROM node:18-alpine
WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/backend/data

ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app/backend
EXPOSE 3001

CMD ["node", "src/index.js"]
