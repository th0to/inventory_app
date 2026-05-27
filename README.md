# Gestion de Stock LAN

Application centralisée en réseau local (LAN) pour la gestion avancée des appareils informatiques, structurée pour offrir sécurité, traçabilité et performances.

## 1. Architecture Technologique

- **Frontend** : React.js (Vite / TypeScript)
- **Backend** : FastAPI (Python)
- **Base de données** : PostgreSQL 16
- **Reverse Proxy** : Nginx (gestion HTTPS et redirection réseau local interne)
- **Conteneurisation** : Déploiement intégral via Docker Compose (isolation complète).

L'architecture est pensée pour un accès depuis un navigateur d'entreprise, uniquement via le port 443 (HTTPS), où Nginx agit comme point d'entrée sécurisé et unique.

## 2. Pré-requis

- Une machine virtuelle Linux (Debian, Ubuntu...) configurée sur le réseau local.
- **Docker** et **Docker Compose** installés sur cette VM.
- `git` pour récupérer ou mettre à jour le code source.
- `openssl` (souvent inclus dans les distributions Linux) pour générer les certificats.

## 3. Démarche de déploiement (VM de Production)

### Étape 1 : Récupérer le projet
Clonez le dépôt sur votre machine virtuelle :
```bash
git clone <url-du-repo-git> /opt/inventory_app
cd /opt/inventory_app
```

### Étape 2 : Configuration de l'environnement
Copiez les fichiers de variables d'environnement et ajustez-les avec vos secrets :
```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```
**Important** : Définissez obligatoirement une valeur robuste et aléatoire pour `JWT_SECRET_KEY` dans `.env`. La clé doit faire 32 caractères minimum. Vous pouvez générer une clé forte avec :
```bash
openssl rand -hex 32
```
*Note : Changer cette clé aura pour effet de déconnecter immédiatement tous les utilisateurs actifs.*

### Sécurisation post-déploiement
Protégez les fichiers de configuration contre la lecture non autorisée sur l'environnement de production :
```bash
chmod 600 .env
chown root:root .env
```

### Étape 3 : Génération des certificats SSL (HTTPS)
Pour assurer l'échange sécurisé des données (le fichier de configuration nginx actuel attend `cert.pem` et `key.pem`), exécutez le script prêt à l'emploi :
```bash
chmod +x nginx/generate_certs.sh
./nginx/generate_certs.sh
```
Ce script créera automatiquement les certificats auto-signés adéquats directement dans `./nginx/certs/`.

### Étape 4 : Lancement des conteneurs
Construisez et lancez la structure Docker :
```bash
docker compose up --build -d
```
Vous pouvez contrôler le statut en vérifiant qu'aucun conteneur n'est en statut `restarting` ou `exited`:
```bash
docker compose ps
```

### Étape 5 : Initialisation de la Base de Données
Une fois les conteneurs initialisés, intégrez les données Excel pré-existantes afin de peupler le registre :
```bash
docker compose exec backend python import_csv.py /path/to/BD_inventory.csv
```
*(Alternativement ou en complément, utiliser `seed.py` si un jeu de test/tables de base d'origine y est défini : `docker compose exec backend python seed.py`)*.

---

## 4. Maintenance & Backups

### Sauvegarde à chaud (Backup) de la BDD
Pour exporter intégralement la base de données existante sans imposer d'arrêt de service (dump SQL complet) :
```bash
docker compose exec -T db pg_dumpall -c -U postgres > backup_stock_$(date +%Y-%m-%d).sql
```
*Note : Si vous avez modifié l'utilisateur par défaut, remplacez `postgres` par la valeur de `$DB_USER`. Il est vivement conseillé d'intégrer cette commande via un job CRON quotidien pour exporter la sauvegarde sur une partition sécurisée.*

Pour arrêter le dispositif complet :
```bash
docker compose down
```
