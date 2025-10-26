# ====== 1단계: 빌드 단계 ======
FROM node:22.15.1-alpine AS build
WORKDIR /app

# npm 최신 버전으로 업데이트 (Alpine 환경에서 npm 10 이상 권장)
RUN npm install -g npm@latest

# package.json 먼저 복사 후 의존성 설치 (캐시 최적화)
COPY package*.json ./

# 💡 기존 node_modules 잔여 캐시 제거 후 설치
RUN rm -rf node_modules package-lock.json && npm install

# 앱 소스 복사
COPY . .

# 환경변수 주입
RUN echo "VITE_APIURL=/api" > .env.production && \
    echo "VITE_MODE=Prod" >> .env.production

# ✅ Vite 프로덕션 빌드 실행
RUN npm run build

# ====== 2단계: Nginx 실행 단계 ======
FROM nginx:latest
WORKDIR /usr/share/nginx/html

# 기본 설정 제거 후 커스텀 conf 복사
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# dist 결과물 복사
COPY --from=build /app/dist .

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
