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

- **Dashboard dynamique** — outil statistique avec barre de filtres globale (entité, catégorie, lieu, responsable) qui recalcule en direct : cartes clés, jauge de disponibilité du stock, et graphiques de répartition (catégorie, entité, responsable, génération)
- **Inventaire** — tableau filtrable avec recherche, taille de page réglable (10/20/50/tout), colonnes contextuelles selon la catégorie filtrée, et fiche détaillée au clic (panneau latéral)
- **Ajout de device** — formulaire structuré avec champs conditionnels selon la catégorie et l'entité
- **Édition / suppression** — les administrateurs modifient une fiche (toutes les infos d'affectation et de caractéristiques) ou la suppriment, avec confirmation
- **Gestion des accès** — deux rôles : utilisateur standard (lecture + ajout) et administrateur (modification + suppression + gestion des comptes)
- **Traçabilité** — historique complet de chaque modification (champ, ancienne valeur, nouvelle valeur, auteur, horodatage)
- **Sécurité** — HTTPS en réseau local (certificat auto-signé), authentification JWT, PostgreSQL jamais exposé

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React.js + TypeScript (Vite) |
| Backend | FastAPI (Python) |
| Base de données | PostgreSQL 16 |
| Ingress / TLS | Traefik (embarqué k3s) ; Nginx sert le build frontend |
| Orchestration | Kubernetes (k3s mono-nœud) |
| Authentification | JWT (JSON Web Tokens) |

---

## Architecture

```
Réseau LAN
    │  HTTPS (port 443)
    ▼
 Ingress Traefik (k3s, TLS)
    ├──▶ Frontend Nginx (fichiers statiques React)
    └──▶ FastAPI ──▶ PostgreSQL
```

Tous les services tournent dans des containers Docker isolés sur une VM Linux. PostgreSQL n'est jamais exposé directement au réseau.

---

## Déploiement (VM de production)

Le déploiement de production se fait sur **Kubernetes (k3s mono-nœud)**, sur une VM
**Debian 13 (Trixie)** provisionnée manuellement. La procédure complète — prérequis VM,
installation de k3s, génération du certificat TLS, création des Secrets, application des
manifestes `k8s/`, import des données et vérifications — est décrite dans
**[K8S_GUIDE.md](./K8S_GUIDE.md)**.

> L'ancien déploiement par **Docker Compose n'est plus maintenu** sur cette branche :
> `docker-compose.yml` a été retiré au profit des manifestes Kubernetes (`k8s/`).

### Import des données existantes (CSV)

Une fois l'application déployée (voir [K8S_GUIDE.md](./K8S_GUIDE.md)), importez
l'inventaire dans le Pod backend :

```bash
POD=$(kubectl get pod -n inventory-app -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl cp BD_inventory.csv inventory-app/$POD:/tmp/BD_inventory.csv

# Vérification à blanc (recommandé d'abord) : valide le mapping et affiche le
# rapport (importés / mis à jour / skippés / erreurs) sans rien écrire en base.
kubectl exec -n inventory-app $POD -- python import_csv.py /tmp/BD_inventory.csv --dry-run

# Import réel (idempotent : ré-exécutable sans dupliquer les devices existants)
kubectl exec -n inventory-app $POD -- python import_csv.py /tmp/BD_inventory.csv
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

### Mise à jour de l'application

Le script [`update.sh`](./update.sh) (sur la VM) met à jour l'application **sans perdre les
données** (`git pull` → build des images → import dans k3s → `rollout restart`) :

```bash
cd ~/inventory_app
./update.sh            # backend + frontend
./update.sh frontend   # ou une seule cible
```

Détails et procédure de maintenance (logs, reset des ID d'appareils…) : voir
[ADMIN_GUIDE.md](./ADMIN_GUIDE.md).

### Sauvegarde de la base de données

```bash
POD=$(kubectl get pod -n inventory-app -l app=postgres -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n inventory-app $POD -- pg_dumpall -c -U postgres > backup_stock_$(date +%Y-%m-%d).sql
```

Recommandé : intégrer cette commande dans un job CRON quotidien.

### Logs & état des Pods

```bash
kubectl get pods -n inventory-app
kubectl logs -n inventory-app deploy/backend
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
