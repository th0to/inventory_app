# Gestion de Stock LAN

Application web centralisée, hébergée en réseau local (LAN), pour la gestion du parc de matériel informatique HP d'un bureau à Genève.

Développée seul dans le cadre d'un projet réel en entreprise, avec l'aide d'outils IA (conception, génération de code, debugging).

> **Statut** : Fonctionnelle en environnement local — déploiement sur VM de production en cours.

---

## Contexte

Le bureau gérait son inventaire sur un fichier Excel partagé, source d'erreurs, de conflits d'accès et d'absence de traçabilité. L'objectif était de migrer vers une application web accessible depuis n'importe quel poste du réseau interne, sans dépendance à Internet.

Le parc couvre plusieurs centaines d'appareils HP (laptops, desktops, workstations, displays, docking, thin clients) répartis entre quatre entités : GVA, Zurich, CDS et FIX.

---

## Fonctionnalités

- **Dashboard** — statistiques en temps réel : répartition par catégorie, entité, emplacement et responsable
- **Inventaire** — tableau filtrable et paginé avec recherche par numéro de série ou modèle
- **Ajout de device** — formulaire structuré avec champs conditionnels selon la catégorie et l'entité
- **Gestion des accès** — deux rôles : utilisateur standard (lecture + ajout) et administrateur (modification + suppression)
- **Traçabilité** — historique complet de chaque modification (champ, ancienne valeur, nouvelle valeur, auteur, horodatage)
- **Sécurité** — HTTPS en réseau local (certificat auto-signé), authentification JWT, PostgreSQL jamais exposé

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React.js + TypeScript (Vite) |
| Backend | FastAPI (Python) |
| Base de données | PostgreSQL 16 |
| Reverse proxy | Nginx (SSL, routage) |
| Conteneurisation | Docker Compose |
| Authentification | JWT (JSON Web Tokens) |

---

## Architecture

```
Réseau LAN
    │  HTTPS (port 443)
    ▼
 Nginx
    ├──▶ React (fichiers statiques)
    └──▶ FastAPI ──▶ PostgreSQL
```

Tous les services tournent dans des containers Docker isolés sur une VM Linux. PostgreSQL n'est jamais exposé directement au réseau.

---

## Déploiement (VM de production)

### Prérequis

- VM Linux (Debian 12 ou Ubuntu 24 LTS)
- Docker et Docker Compose installés
- `git` et `openssl` disponibles

### Étape 1 — Récupérer le projet

```bash
git clone <url-du-repo-git> /opt/inventory_app
cd /opt/inventory_app
```

### Étape 2 — Configuration de l'environnement

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Définir une clé JWT robuste dans `.env` (32 caractères minimum) :

```bash
openssl rand -hex 32
```

Puis sécuriser le fichier :

```bash
chmod 600 .env
chown root:root .env
```

### Étape 3 — Génération des certificats SSL

```bash
chmod +x nginx/generate_certs.sh
./nginx/generate_certs.sh
```

Les certificats auto-signés sont créés dans `./nginx/certs/`.

### Étape 4 — Lancement

```bash
docker compose up --build -d
docker compose ps
```

### Étape 5 — Import des données existantes

```bash
# Vérification à blanc (recommandé d'abord) : valide le mapping et affiche le
# rapport (importés / mis à jour / skippés / erreurs) sans rien écrire en base.
docker compose exec backend python import_csv.py /path/to/BD_inventory.csv --dry-run

# Import réel (idempotent : ré-exécutable sans dupliquer les devices existants)
docker compose exec backend python import_csv.py /path/to/BD_inventory.csv
```

Le script :

- est **idempotent** : un device déjà présent (même `Serial Number`) est mis à
  jour si des champs ont changé (avec une entrée dans `device_history`), sinon
  laissé tel quel — aucune duplication.
- **rejette** les lignes sans `Serial Number` (listées dans le rapport) au lieu de
  générer un identifiant aléatoire.
- crée à la volée les comptes des `OWNER` inconnus avec un **mot de passe fort
  aléatoire**, écrit dans un fichier `imported_accounts_<timestamp>.log` (jamais
  affiché en clair, jamais committé — voir `.gitignore`). Communiquez ces mots de
  passe manuellement.
  > ⚠️ L'application ne gère pas encore le changement de mot de passe à la première
  > connexion : faites-le changer manuellement après communication.

`BD_inventory.csv` contient des numéros de série et des noms réels : il est exclu
du dépôt via `.gitignore` et ne doit **jamais** être committé.

---

## Maintenance & Backups

### Sauvegarde de la base de données

```bash
docker compose exec -T db pg_dumpall -c -U postgres > backup_stock_$(date +%Y-%m-%d).sql
```

Recommandé : intégrer cette commande dans un job CRON quotidien.

### Arrêt

```bash
docker compose down
```

---

## Documentation

| Document | Description |
|---|---|
| [USER_GUIDE.md](./USER_GUIDE.md) | Guide d'utilisation pour les utilisateurs finaux |
| [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) | Guide administrateur (comptes, backups, maintenance) |

---

## Auteur

Thomas Marinier — Étudiant en Bachelor Informatique (Geneva Institute of Technology)  
Projet réalisé seul, en environnement réel d'entreprise.
