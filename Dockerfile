# router-monitor-frontend/Dockerfile
# Stage 1: build the React app into static files
# Stage 2: serve those files with a tiny nginx server

# ---------- Stage 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# Vite outputs the built site into /app/dist

# ---------- Stage 2: serve ----------
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
