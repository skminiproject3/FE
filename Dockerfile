# ====== 1단계: 빌드 단계 ======
FROM node:22.15.1-alpine AS build
WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm install

# 소스 복사 및 빌드 (Vite는 자동으로 .env.production 사용)
COPY . .
RUN npm run build

# ====== 2단계: Nginx 실행 단계 ======
FROM nginx:latest
WORKDIR /usr/share/nginx/html

# 기본 설정 제거 후 커스텀 설정 복사
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 결과물 복사
COPY --from=build /app/dist .

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
