# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: Production backend + frontend static
# ใช้ Debian แทน Alpine เพื่อแก้ปัญหา TLS/HTTP กับ Google APIs (v4/token Premature close)
FROM node:22
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ .
COPY --from=frontend-build /app/dist ./www
EXPOSE 3000
CMD ["node", "server.js"]
