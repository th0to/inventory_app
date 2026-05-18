# inventory_app
Application de gestion des stocks de materiel d'exposition

## Lancer le stack Docker en local

1. Copier l'exemple d'environnement :
   ```bash
   cp .env.example .env
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
   - API backend (via Nginx) : `http://localhost/api/...`
   - Healthcheck backend : `http://localhost/api/health`

Arrêt de la stack :
```bash
docker compose down
```
