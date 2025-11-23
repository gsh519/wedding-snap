FROM node:20-alpine

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# アプリケーションコードをコピー
COPY . .

# ポート3000を公開
EXPOSE 3000
