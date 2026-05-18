FROM node:20-alpine

WORKDIR /app

COPY . .

RUN if [ -f package.json ]; then \
        if [ -f package-lock.json ]; then npm ci; else npm install; fi \
        && npm run build; \
      else \
        mkdir -p /app/dist \
        && printf '%s\n' '<!doctype html><html><head><meta charset="utf-8"><title>Inventory App</title></head><body><h1>Frontend indisponible</h1><p>Ajoutez les sources React dans /frontend.</p></body></html>' > /app/dist/index.html; \
      fi

EXPOSE 3000

CMD ["sh", "-c", "if [ -d /app/build ]; then TARGET_DIR=/app/build; elif [ -d /app/dist ]; then TARGET_DIR=/app/dist; else echo 'Aucun build frontend trouvé'; exit 1; fi; export TARGET_DIR; node /app/server.js"]
