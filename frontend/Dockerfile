FROM node:20-alpine

WORKDIR /app

COPY . .

RUN if [ -f package.json ]; then \
        if [ -f package-lock.json ]; then npm ci; else npm install; fi \
        && npm run build; \
      else \
        mkdir -p /app/dist \
        && cp /app/fallback.html /app/dist/index.html; \
      fi

EXPOSE 3000

CMD ["sh", "-c", "if [ -d /app/build ]; then TARGET_DIR=/app/build; elif [ -d /app/dist ]; then TARGET_DIR=/app/dist; else echo 'Aucun build frontend trouvé'; exit 1; fi; export TARGET_DIR; node /app/server.js"]
