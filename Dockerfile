# ====== 1단계: 빌드 단계 ======
FROM node:22.15.1-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 이 부분 추가
RUN echo "VITE_APIURL=/api" > .env.production && \
    echo "VITE_MODE=Prod" >> .env.production

RUN npm run build

# ====== 2단계: Nginx 실행 단계 ======
FROM nginx:latest
WORKDIR /usr/share/nginx/html

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist .

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
