# ====== 1단계: 빌드 단계 ======
FROM node:22.15.1-alpine AS build
WORKDIR /app

# ✅ ① Alpine 빌드 툴 설치 (중요)
RUN apk add --no-cache python3 make g++

# ✅ ② package.json 복사 후 의존성 설치
COPY package*.json ./
RUN npm install

# ✅ ③ 프로젝트 전체 복사
COPY . .

# ✅ ④ 환경 변수 파일 추가
RUN echo "VITE_APIURL=/api" > .env.production && \
    echo "VITE_MODE=Prod" >> .env.production

# ✅ ⑤ Vite 빌드 실행
RUN npm run build

# ====== 2단계: Nginx 실행 단계 ======
FROM nginx:latest
WORKDIR /usr/share/nginx/html

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# ✅ dist 폴더 복사
COPY --from=build /app/dist .

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
