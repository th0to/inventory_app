# inventory_app
Application de gestion des stocks de materiel d'exposition

## Lancer le stack Docker en local

1. Copier l'exemple d'environnement :
   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env
   ```
2. Modifier au minimum `JWT_SECRET_KEY` dans `.env` avec une valeur aléatoire robuste (32+ caractères).
3. Construire et démarrer la stack :
   ```bash
   docker compose up --build -d
   ```
4. Vérifier les services :
   ```bash
   docker compose ps
   ```
5. Accès local :
   - Frontend (via Nginx) : `http://localhost`
   - Frontend HTTPS (via Nginx) : `https://localhost`
   - API backend (via Nginx) : `http://localhost/api/...`
   - Exemple endpoint API : `http://localhost/api/auth/login`

## HTTPS Nginx (port 443)

Le fichier `nginx/nginx.conf` attend ces certificats :
- `nginx/certs/fullchain.pem`
- `nginx/certs/privkey.pem`

En local, vous pouvez générer un certificat autosigné dans `nginx/certs/` avant `docker compose up`.

## Variable API Vite

- `frontend/.env` : `VITE_API_BASE_URL=/api`
- Avec `/api`, le frontend cible automatiquement le même hôte que la page courante (dynamique), et Nginx redirige vers le backend.
- Vous pouvez aussi définir une URL absolue (ex: `https://mon-hote.exemple/api`) si nécessaire.

Arrêt de la stack :
```bash
docker compose down
```
