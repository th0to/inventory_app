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

CMD ["sh", "-c", "if [ -d /app/build ]; then TARGET_DIR=/app/build; elif [ -d /app/dist ]; then TARGET_DIR=/app/dist; else echo 'Aucun build frontend trouvé'; exit 1; fi; TARGET_DIR=$TARGET_DIR node -e \"const http=require('http');const fs=require('fs');const path=require('path');const base=process.env.TARGET_DIR;const port=3000;const typeByExt={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.map':'application/json; charset=utf-8'};http.createServer((req,res)=>{const urlPath=decodeURIComponent((req.url||'/').split('?')[0]);let filePath=path.join(base,urlPath.replace(/^\\//,''));if(urlPath==='/'||urlPath.endsWith('/'))filePath=path.join(base,urlPath.replace(/^\\//,''),'index.html');if(!filePath.startsWith(base)){res.writeHead(403);res.end('Forbidden');return;}fs.readFile(filePath,(err,data)=>{if(err){fs.readFile(path.join(base,'index.html'),(fallbackErr,fallbackData)=>{if(fallbackErr){res.writeHead(404);res.end('Not found');return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.writeHead(200);res.end(fallbackData);});return;}res.setHeader('Content-Type',typeByExt[path.extname(filePath)]||'application/octet-stream');res.writeHead(200);res.end(data);});}).listen(port,'0.0.0.0',()=>console.log('Frontend server listening on '+port));\""]
