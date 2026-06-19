# Plan d'action — Application de Gestion de Stock LAN
**Version** : 2.0  
**Date** : Mai 2026  
**Auteur** : À compléter  
**Statut** : Document de conception — avant développement

---

## Table des matières

1. [Contexte et objectifs](#1-contexte-et-objectifs)
2. [Périmètre fonctionnel](#2-périmètre-fonctionnel)
3. [Architecture technique](#3-architecture-technique)
4. [Diagrammes UML — Vue synthétique](#4-diagrammes-uml--vue-synthétique)
5. [Diagrammes UML — Vue détaillée Backend](#5-diagrammes-uml--vue-détaillée-backend)
6. [Diagrammes UML — Vue détaillée Frontend](#6-diagrammes-uml--vue-détaillée-frontend)
7. [Modèle de données](#7-modèle-de-données)
8. [Sécurité et gestion des accès](#8-sécurité-et-gestion-des-accès)
9. [Plan d'action et phases de développement](#9-plan-daction-et-phases-de-développement)
10. [Risques et points d'attention](#10-risques-et-points-dattention)
11. [Glossaire](#11-glossaire)

---

## 1. Contexte et objectifs

### 1.1 Contexte

L'entreprise (bureau GVA) gère un parc de matériel informatique HP réparti entre plusieurs entités (GVA, Zurich, CDS, FIX) et plusieurs statuts (Stock, Showroom, Client, Test, etc.). Cet inventaire est aujourd'hui maintenu dans un fichier Excel partagé, ce qui pose des problèmes de fiabilité, de traçabilité et d'accès concurrent.

L'objectif est de migrer cet inventaire vers une application web centralisée, hébergée sur le réseau local (LAN) de l'entreprise, accessible depuis n'importe quel poste du réseau via un navigateur.

### 1.2 Objectifs

- Centraliser l'inventaire des devices dans une base de données unique et fiable
- Offrir une visualisation claire du parc (statistiques, tableaux)
- Permettre la saisie de nouveaux devices via un formulaire structuré
- Contrôler les droits d'accès : distinction entre utilisateurs standard et administrateurs
- Garantir la sécurité des échanges via HTTPS, même en réseau local
- Prévoir l'intégration future des modules RENDU, Intune et WXP

### 1.3 Contraintes

| Contrainte | Détail |
|---|---|
| Réseau | Accessible uniquement en LAN (pas d'accès Internet) |
| Utilisateurs simultanés | Moins de 10 |
| Hébergement | VM Linux sur serveur interne |
| Sécurité | HTTPS obligatoire, authentification par rôle |
| Déploiement | Docker Compose (isolation et reproductibilité) |
| Données existantes | Migration depuis le fichier Excel existant (feuille Inventory) |

---

## 2. Périmètre fonctionnel

### 2.1 Pages de l'application — V1

| Page | Accès | Fonctionnalité |
|---|---|---|
| **Dashboard** | Tous les utilisateurs connectés | Statistiques dynamiques sur le parc |
| **Inventaire** | Lecture : tous — Modification : admins uniquement | Tableau complet des devices, filtrable |
| **Ajout d'un device** | Tous les utilisateurs connectés | Formulaire de saisie d'un nouveau device |

### 2.2 Modules prévus — V2 (hors périmètre V1)

| Module | Description |
|---|---|
| **RENDU** | Suivi des appareils retournés ou envoyés en service |
| **Intune** | Gestion des devices enrôlés dans Microsoft Intune (MDM) |
| **WXP** | Données HP Wolf Security / Wolf Protect & Trace |
| **Boite Vide** | Suivi des emballages disponibles |

### 2.3 Rôles utilisateurs

| Rôle | Droits |
|---|---|
| **Visiteur (non connecté)** | Aucun accès — redirection vers login |
| **Utilisateur standard** | Lecture de toutes les pages V1, ajout de devices |
| **Administrateur** | Tous les droits + modification/suppression dans l'inventaire |

### 2.4 Données métier gérées

L'inventaire couvre les catégories de matériel suivantes, issues de la base existante :

| Catégorie | Exemples |
|---|---|
| Laptop | HP EliteBook 6/8/X, Dragonfly, ZBook X |
| Desktop | HP EliteDesk 800, EliteMini, EliteSFF |
| Mobile Workstation | HP ZBook Fury, ZBook Ultra, ZBook Studio |
| Workstation | HP Z2 Mini, Z2 Tower, Z8, ZGX Nano |
| Display | HP Z24u, E45c, 524pf, 734pm, 738pu |
| Docking | HP Thunderbolt G6, USB-C G5/G6 |
| Thin Client | HP mt22, mt44, ProDesk 5 G1i |
| Peripheral | Claviers, accessoires |

Chaque device appartient à l'une des quatre entités sources :

| Source | Description | Numéro de commande |
|---|---|---|
| **GVA** | Bureau principal (notre company) | Non |
| **Zurich** | Bureau de Zurich | Oui |
| **CDS** | Entité CDS | Non |
| **FIX** | Entité FIX | Non |

---

## 3. Architecture technique

### 3.1 Stack technologique

| Couche | Technologie | Justification |
|---|---|---|
| Frontend | React.js | Interface dynamique, composants réutilisables |
| Backend | FastAPI (Python) | Léger, performant, documentation auto-générée |
| Base de données | PostgreSQL | Robuste, open source, adapté aux données structurées |
| Reverse proxy | Nginx | Gestion SSL, routage des requêtes |
| Conteneurisation | Docker Compose | Déploiement reproductible sur VM Linux |
| Authentification | JWT (JSON Web Tokens) | Standard industrie, stateless |

### 3.2 Vue d'ensemble de l'infrastructure

```
Réseau LAN entreprise
         │
         │  HTTPS (port 443)
         ▼
┌─────────────────────────────────────────────┐
│              VM Linux (Debian/Ubuntu)        │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │          Docker Compose              │   │
│  │                                      │   │
│  │  ┌────────┐    ┌─────────────────┐   │   │
│  │  │ Nginx  │───▶│    Frontend     │   │   │
│  │  │  SSL   │    │    (React)      │   │   │
│  │  └───┬────┘    └─────────────────┘   │   │
│  │      │                               │   │
│  │      │         ┌─────────────────┐   │   │
│  │      └────────▶│    Backend      │   │   │
│  │                │    (FastAPI)    │   │   │
│  │                └────────┬────────┘   │   │
│  │                         │            │   │
│  │                ┌────────▼────────┐   │   │
│  │                │   PostgreSQL    │   │   │
│  │                │  (volume disque)│   │   │
│  │                └─────────────────┘   │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 3.3 Communication entre containers

```
LAN → Nginx              ✓ port 443 uniquement (HTTPS)
Nginx → React            ✓ réseau Docker interne (fichiers statiques)
Nginx → FastAPI          ✓ réseau Docker interne (/api/*)
FastAPI → PostgreSQL     ✓ réseau Docker interne
PostgreSQL → LAN         ✗ jamais exposé directement
Internet                 ✗ bloqué
```

### 3.4 Squelette docker-compose.yml

```yaml
version: '3.9'

services:

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/certs:/etc/nginx/certs
    depends_on:
      - backend
      - frontend

  frontend:
    build: ./frontend
    networks:
      - internal

  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/stock
    depends_on:
      - db
    networks:
      - internal

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: stock
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - internal

networks:
  internal:
    driver: bridge

volumes:
  postgres_data:
```

---

## 4. Diagrammes UML — Vue synthétique

### 4.1 Diagramme de cas d'utilisation (Use Case)

```
┌──────────────────────────────────────────────────────────────┐
│                     Système Stock LAN — V1                    │
│                                                              │
│   ┌──────────────────────────────┐                           │
│   │   Se connecter               │◀─────────────────────┐    │
│   └──────────────────────────────┘                      │    │
│                                                         │    │
│   ┌──────────────────────────────┐                      │    │
│   │   Consulter le dashboard     │◀─────────────────┐   │    │
│   └──────────────────────────────┘                  │   │    │
│                                                     │   │    │
│   ┌──────────────────────────────┐                  │   │    │
│   │   Consulter l'inventaire     │◀─────────────────┤   │    │
│   └──────────────────────────────┘                  │   │    │
│                                                     │   │    │
│   ┌──────────────────────────────┐             [Utilisateur]  │
│   │   Ajouter un device          │◀─────────────────┤   │    │
│   └──────────────────────────────┘                  │   │    │
│                                                     │   │    │
│   ┌──────────────────────────────┐                  │   │    │
│   │   Modifier un device         │◀─────────────────┘   │    │
│   └──────────────────────────────┘                      │    │
│                           ▲                              │    │
│                    [Administrateur]──────────────────────┘    │
│                    (hérite de Utilisateur)                    │
│                                                              │
│   ┌──────────────────────────────┐                           │
│   │   Supprimer un device        │◀── [Administrateur]       │
│   └──────────────────────────────┘                           │
│                                                              │
│   ┌──────────────────────────────┐                           │
│   │   Gérer les utilisateurs     │◀── [Administrateur]       │
│   └──────────────────────────────┘                           │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Diagramme de composants (vue synthétique)

```
┌──────────────┐     HTTPS/JSON      ┌──────────────────┐
│   Navigateur │ ◀─────────────────▶ │   Nginx          │
│   (Client)   │                     │   Reverse Proxy  │
└──────────────┘                     └────────┬─────────┘
                                              │
                           ┌──────────────────┼──────────────────┐
                           │                  │                   │
                    ┌──────▼──────┐    ┌──────▼──────┐   Statique
                    │   FastAPI   │    │    React    │   (fichiers)
                    │   Backend   │    │   Frontend  │
                    └──────┬──────┘    └─────────────┘
                           │
                    ┌──────▼──────┐
                    │ PostgreSQL  │
                    │     DB      │
                    └─────────────┘
```

---

## 5. Diagrammes UML — Vue détaillée Backend

### 5.1 Diagramme de classes — Backend FastAPI

Ce diagramme représente l'ensemble des classes Python du backend : modèles de données (ORM), schémas de validation et routeurs API.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          MODÈLES ORM (SQLAlchemy)                    │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐
│       UserModel       │       │     EntityModel       │
├──────────────────────┤       ├──────────────────────┤
│ - id: int (PK)        │       │ - id: int (PK)        │
│ - username: str       │       │ - name: str           │
│ - email: str          │       │   (GVA/Zurich/CDS/FIX)│
│ - password_hash: str  │       │ - has_order_num: bool │
│ - role: Enum          │       └──────────────────────┘
│   (user / admin)      │                  │ 1
│ - is_active: bool     │                  │
│ - created_at: datetime│                  │ N
└──────────────────────┘       ┌───────────▼──────────┐
         │ 1                   │     DeviceModel       │
         │                     ├──────────────────────┤
         │ N (owner_id)        │ - id: int (PK)        │
         └────────────────────▶│ - serial_number: str  │
         │ N (created_by)      │ - model_name: str     │
         └────────────────────▶│ - generation: str?    │
         │ N (updated_by)      │ - category_id: int FK │
         └────────────────────▶│ - entity_id: int FK   │
                               │ - order_number: str?  │
                               │ - location_id: int FK │
                               │ - owner_id: int FK    │
                               │ - client_id: int? FK  │
                               │ - is_pv: bool         │
                               │ - cpu: str?           │
                               │ - ram_gb: int?        │
                               │ - storage_gb: int?    │
                               │ - screen_size: float? │
                               │ - power_w: int?       │
                               │ - comment: str?       │
                               │ - is_archived: bool   │
                               │ - created_by: int FK  │
                               │ - updated_by: int? FK │
                               │ - created_at: datetime│
                               │ - updated_at: datetime│
                               └──────────┬───────────┘
                                          │ 1
                                          │ N
                               ┌──────────▼───────────┐
                               │  DeviceHistoryModel   │
                               ├──────────────────────┤
                               │ - id: int (PK)        │
                               │ - device_id: int FK   │
                               │ - user_id: int FK     │
                               │ - field_changed: str  │
                               │ - old_value: str      │
                               │ - new_value: str      │
                               │ - changed_at: datetime│
                               └──────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐
│    CategoryModel      │       │     ClientModel       │
├──────────────────────┤       ├──────────────────────┤
│ - id: int (PK)        │       │ - id: int (PK)        │
│ - name: str           │       │ - name: str           │
│   (Laptop/Desktop...) │       │ - contact: str?       │
└──────────────────────┘       │ - sent_date: date?    │
                               └──────────────────────┘
┌──────────────────────┐
│    LocationModel      │
├──────────────────────┤
│ - id: int (PK)        │
│ - name: str           │
│   (Stock/Showroom/    │
│    Client/Test/5eme/  │
│    Smart Locker)      │
└──────────────────────┘

─────────────────────────────────────────────────────────────────────
                       SCHÉMAS PYDANTIC (Validation)
─────────────────────────────────────────────────────────────────────

┌──────────────────────┐       ┌──────────────────────┐
│   DeviceCreateSchema  │       │   DeviceUpdateSchema  │
├──────────────────────┤       ├──────────────────────┤
│ + serial_number: str  │       │ + location_id?: int   │
│ + model_name: str     │       │ + client_id?: int     │
│ + generation?: str    │       │ + owner_id?: int      │
│ + category_id: int    │       │ + comment?: str       │
│ + entity_id: int      │       │ + is_archived?: bool  │
│ + order_number?: str  │       └──────────────────────┘
│ + location_id: int    │
│ + owner_id: int       │       ┌──────────────────────┐
│ + client_id?: int     │       │   DeviceReadSchema    │
│ + is_pv?: bool        │       ├──────────────────────┤
│ + cpu?: str           │       │ (tous les champs)     │
│ + ram_gb?: int        │       │ + category: str       │
│ + storage_gb?: int    │       │ + entity: str         │
│ + screen_size?: float │       │ + location: str       │
│ + power_w?: int       │       │ + client?: str        │
│ + comment?: str       │       │ + owner: str          │
└──────────────────────┘       └──────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐
│   UserCreateSchema    │       │     TokenSchema       │
├──────────────────────┤       ├──────────────────────┤
│ + username: str       │       │ + access_token: str   │
│ + email: str          │       │ + token_type: str     │
│ + password: str       │       │ + role: str           │
│ + role: Enum          │       └──────────────────────┘
└──────────────────────┘

─────────────────────────────────────────────────────────────────────
                          ROUTEURS API (Endpoints)
─────────────────────────────────────────────────────────────────────

┌──────────────────────────────────────────┐
│              AuthRouter                   │
│              /api/auth                    │
├──────────────────────────────────────────┤
│ + POST /login(credentials) → Token        │
│ + POST /logout() → void                   │
│ + GET  /me() → UserRead                   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│             DeviceRouter                  │
│             /api/devices                  │
├──────────────────────────────────────────┤
│ + GET    /()          → List[DeviceRead]  │
│   params: category, entity, location,     │
│           owner, search, page, limit      │
│ + GET    /{id}()      → DeviceRead        │
│ + POST   /()          → DeviceRead [auth] │
│ + PUT    /{id}()      → DeviceRead [admin]│
│ + DELETE /{id}()      → void       [admin]│
│ + GET    /{id}/history → List[History]    │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│              StatsRouter                  │
│              /api/stats                   │
├──────────────────────────────────────────┤
│ + GET /summary()      → StatsGlobal       │
│   (total, par catégorie, par entité,      │
│    par lieu, par owner)                   │
│ + GET /by-category()  → List[CatStat]    │
│ + GET /by-entity()    → List[EntityStat] │
│ + GET /by-location()  → List[LocStat]    │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│           ReferenceRouter                 │
│           /api/ref                        │
├──────────────────────────────────────────┤
│ + GET /categories()   → List[Category]   │
│ + GET /entities()     → List[Entity]     │
│ + GET /locations()    → List[Location]   │
│ + GET /clients()      → List[Client]     │
│ + GET /owners()       → List[User]       │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│              UserRouter                   │
│              /api/users                   │
├──────────────────────────────────────────┤
│ + GET    /()      → List[UserRead] [admin]│
│ + POST   /()      → UserRead       [admin]│
│ + PUT    /{id}()  → UserRead       [admin]│
│ + DELETE /{id}()  → void           [admin]│
└──────────────────────────────────────────┘
```

### 5.2 Diagramme de séquence — Connexion utilisateur

```
Utilisateur    Navigateur      Nginx        FastAPI      PostgreSQL
     │               │            │              │              │
     │  Saisit       │            │              │              │
     │  login/mdp    │            │              │              │
     │──────────────▶│            │              │              │
     │               │ POST /api/auth/login       │              │
     │               │───────────▶│              │              │
     │               │            │─────────────▶│              │
     │               │            │              │ SELECT user  │
     │               │            │              │─────────────▶│
     │               │            │              │◀─────────────│
     │               │            │              │ Vérifie hash │
     │               │            │◀─────────────│ JWT généré   │
     │               │◀───────────│  Token JWT   │              │
     │               │ Stocke le  │              │              │
     │               │ token      │              │              │
     │◀──────────────│            │              │              │
     │  → /dashboard │            │              │              │
```

### 5.3 Diagramme de séquence — Consultation du Dashboard

```
Utilisateur    Navigateur      Nginx        FastAPI      PostgreSQL
     │               │            │              │              │
     │  Accède à     │            │              │              │
     │  /dashboard   │            │              │              │
     │──────────────▶│            │              │              │
     │               │ GET /api/stats/summary     │              │
     │               │ + JWT token│              │              │
     │               │───────────▶│              │              │
     │               │            │─────────────▶│              │
     │               │            │              │ Valide token │
     │               │            │              │ SELECT stats │
     │               │            │              │─────────────▶│
     │               │            │              │◀─────────────│
     │               │            │◀─────────────│  JSON data   │
     │               │◀───────────│              │              │
     │◀──────────────│ Graphiques │              │              │
     │               │ affichés   │              │              │
```

### 5.4 Diagramme de séquence — Modification d'un device (Admin)

```
Admin          Navigateur      Nginx        FastAPI      PostgreSQL
  │                │              │              │              │
  │  Modifie une   │              │              │              │
  │  cellule       │              │              │              │
  │───────────────▶│              │              │              │
  │                │ PUT /api/devices/{id}        │              │
  │                │ + JWT (role=admin)           │              │
  │                │─────────────▶│              │              │
  │                │              │─────────────▶│              │
  │                │              │              │ Valide token │
  │                │              │              │ Vérifie rôle │
  │                │              │              │ UPDATE device│
  │                │              │              │ INSERT history
  │                │              │              │─────────────▶│
  │                │              │              │◀─────────────│
  │                │              │◀─────────────│  200 OK      │
  │                │◀─────────────│              │              │
  │◀───────────────│ Confirmation │              │              │

  ─ ─ ─ ─ ─ ─ ─ ─  Si rôle ≠ ADMIN ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

  │                │              │ 403 Forbidden│              │
  │                │◀─────────────│              │              │
  │◀───────────────│ "Accès refusé"              │              │
```

### 5.5 Diagramme de séquence — Ajout d'un device

```
Utilisateur    Navigateur      Nginx        FastAPI      PostgreSQL
     │               │            │              │              │
     │  Remplit le   │            │              │              │
     │  formulaire   │            │              │              │
     │──────────────▶│            │              │              │
     │               │ Validation │              │              │
     │               │ côté client│              │              │
     │               │            │              │              │
     │               │ POST /api/devices          │              │
     │               │ + JWT token│              │              │
     │               │───────────▶│              │              │
     │               │            │─────────────▶│              │
     │               │            │              │ S/N unique ? │
     │               │            │              │─────────────▶│
     │               │            │              │ INSERT device│
     │               │            │              │ INSERT history
     │               │            │              │─────────────▶│
     │               │            │              │◀─────────────│
     │               │            │◀─────────────│ 201 Created  │
     │               │◀───────────│              │              │
     │◀──────────────│ Succès +   │              │              │
     │  formulaire   │ reset form │              │              │
     │  réinitialisé │            │              │              │
```

### 5.6 Diagramme d'activité — Flux d'authentification

```
         [Début]
            │
            ▼
    ┌───────────────┐
    │ Accès à une   │
    │ page protégée │
    └───────┬───────┘
            │
            ▼
    ┌───────────────────┐  Non   ┌──────────────────┐
    │ Token JWT présent │───────▶│ Redirection vers │
    │ dans navigateur ? │        │ page /login      │
    └────────┬──────────┘        └────────┬─────────┘
             │ Oui                        │
             ▼                            ▼
    ┌──────────────────┐       ┌──────────────────────┐
    │ Token valide et  │  Non  │ Saisie identifiants  │
    │ non expiré ?     │──────▶│                      │
    └──┬───────────────┘       └──────────┬───────────┘
       │ Oui                   Non        │ Oui
       │                        ▼         ▼
       │                  Erreur login  ┌──────────────────┐
       │                               │ Génération token │
       │                               │ JWT (rôle inclus)│
       │                               └────────┬─────────┘
       │                                        │
       ▼                                        ▼
    ┌──────────────────────────────────────────────┐
    │  Vérification du rôle requis pour l'action    │
    ├──────────────────────────────────────────────┤
    │  user  → accès lecture + ajout               │
    │  admin → accès complet                       │
    └──────────────────────────────────────────────┘
            │
          [Fin]
```

### 5.7 Diagramme d'état — Cycle de vie d'un device

```
                      [Création / Import]
                              │
                              ▼
                    ┌─────────────────┐
              ┌────▶│     STOCK       │◀────────────────────┐
              │     │  (disponible)   │                     │
              │     └────────┬────────┘                     │
              │              │                              │
       Retour │    ┌─────────┼──────────┬───────────┐  Retour stock
       stock  │    │         │          │           │       │
              │    ▼         ▼          ▼           ▼       │
              │ ┌────────┐ ┌─────────┐ ┌────────┐ ┌──────┐ │
              └─│SHOWROOM│ │ CLIENT  │ │  TEST  │ │5ème /│─┘
                │        │ │(déployé)│ │ (démo) │ │Locker│
                └────────┘ └────┬────┘ └────────┘ └──────┘
                                │
                                │ Retour / Fin contrat
                                ▼
                         ┌────────────┐
                         │   RENDU    │  → Module V2
                         │ (retourné) │
                         └─────┬──────┘
                               │
                               ▼
                        ┌──────────────┐
                        │   ARCHIVÉ    │
                        │ (suppression │
                        │   logique)   │
                        └──────────────┘
```

---

## 6. Diagrammes UML — Vue détaillée Frontend

> **Pourquoi des diagrammes UML pour le frontend ?**
> L'UML n'est pas réservé au backend. Pour une application React, trois types de diagrammes apportent une vraie valeur : le **diagramme de composants** (qui montre la hiérarchie de l'interface), le **diagramme de navigation** (qui montre les transitions entre pages), et le **diagramme de flux de données** (qui montre d'où viennent les données affichées). Ensemble, ils permettent de comprendre l'application sans voir une ligne de code.

### 6.1 Diagramme de composants React

Ce diagramme montre la hiérarchie et les dépendances entre tous les composants de l'interface.

```
App (Root)
├── AuthProvider              ← Contexte global : token JWT, rôle, user
│
├── Router
│   ├── /login
│   │   └── LoginPage
│   │       └── LoginForm
│   │           ├── InputField
│   │           └── Button
│   │
│   ├── /dashboard            [route protégée - tous les users]
│   │   └── DashboardPage
│   │       ├── NavBar
│   │       ├── StatCard (×4)
│   │       │   (Total parc, En stock, Chez client, En test/showroom)
│   │       ├── ChartByCategory    ← camembert par type de device
│   │       ├── ChartByEntity      ← barres GVA / Zurich / CDS / FIX
│   │       ├── ChartByLocation    ← barres Stock / Client / Showroom…
│   │       └── TopOwnersList      ← tableau : owner → nb devices
│   │
│   ├── /inventory            [route protégée - tous les users]
│   │   └── InventoryPage
│   │       ├── NavBar
│   │       ├── FilterBar
│   │       │   ├── SelectFilter  (Catégorie)
│   │       │   ├── SelectFilter  (Entité : GVA/Zurich/CDS/FIX)
│   │       │   ├── SelectFilter  (Lieu)
│   │       │   ├── SelectFilter  (Owner)
│   │       │   └── SearchInput   (S/N ou nom de modèle)
│   │       ├── DeviceTable
│   │       │   ├── TableHeader
│   │       │   ├── DeviceRow (×N)
│   │       │   │   ├── [tous]         → affichage des données
│   │       │   │   └── [admin only]   → EditButton + DeleteButton
│   │       │   └── Pagination
│   │       └── EditDeviceModal   [admin only]
│   │           └── DeviceForm    (mode édition)
│   │
│   └── /add-device           [route protégée - tous les users]
│       └── AddDevicePage
│           ├── NavBar
│           └── DeviceForm        (mode création)
│               ├── InputField        Serial Number *
│               ├── InputField        Nom du modèle *
│               ├── InputField        Génération
│               ├── SelectField       Catégorie *
│               ├── SelectField       Entité source * (GVA/Zurich/CDS/FIX)
│               ├── InputField        N° commande  [visible si Zurich]
│               ├── SelectField       Lieu *
│               ├── SelectField       Owner *
│               ├── SelectField       Client       [visible si lieu=Client]
│               ├── CheckBox          PV / Demo unit
│               ├── InputField        CPU          [si Laptop/Desktop/WS]
│               ├── InputField        RAM (GB)     [si Laptop/Desktop/WS]
│               ├── InputField        Stockage (GB)[si Laptop/Desktop/WS]
│               ├── InputField        Taille écran [si Display]
│               ├── InputField        Puissance (W)[si Docking]
│               ├── TextArea          Commentaire
│               └── SubmitButton
│
└── SharedComponents
    ├── NavBar              ← navigation + nom utilisateur + logout
    ├── Button              ← bouton générique (variantes: primary/danger)
    ├── InputField          ← champ texte avec label + message d'erreur
    ├── SelectField         ← liste déroulante avec options dynamiques
    ├── Modal               ← fenêtre modale générique (titre + contenu)
    ├── Toast               ← notification succès / erreur (auto-dismiss)
    ├── Loader              ← spinner pendant les appels API
    └── ProtectedRoute      ← HOC : redirige vers /login si non connecté
```

### 6.2 Diagramme de navigation (State Machine des pages)

Ce diagramme montre toutes les transitions possibles entre les pages de l'application.

```
                    [Arrivée sur l'app]
                            │
                            ▼
                    ┌───────────────┐
              ┌────▶│   /login      │
              │     └───────┬───────┘
              │             │ Authentification réussie
              │             ▼
              │     ┌───────────────────────────────┐
   Token      │     │         /dashboard            │◀──────────┐
   expiré /   │     │  (page d'accueil par défaut)  │           │
   Logout     │     └──────┬───────────────┬────────┘           │
              │            │               │                    │
              │   Clic nav │               │ Clic nav           │
              │  Inventaire│               │ Ajouter device     │
              │            ▼               ▼                    │
              │     ┌──────────────┐  ┌────────────────┐        │
              │     │  /inventory  │  │  /add-device   │        │
              │     └──────┬───────┘  └───────┬────────┘        │
              │            │  [admin]          │                 │
              │            │ Clic Modifier     │ Soumission OK   │
              │            ▼                  └─────────────────┘
              │     ┌──────────────┐
              │     │ Modal édition│
              │     │  (overlay)   │
              │     └──────────────┘
              │
              └──────── Logout ou token expiré (depuis toutes les pages)
```

### 6.3 Diagramme de flux de données (Data Flow Diagram)

Ce diagramme montre comment les données transitent du backend vers chaque page de l'interface.

```
PostgreSQL ──▶ FastAPI ──▶ Nginx ──▶ React
                                        │
               ┌────────────────────────┼────────────────────────┐
               │                        │                        │
               ▼                        ▼                        ▼
       GET /api/stats/*         GET /api/devices        GET /api/ref/*
               │                        │                        │
               ▼                        ▼                        ▼
      ┌─────────────────┐    ┌───────────────────┐   ┌──────────────────┐
      │  DashboardPage  │    │   InventoryPage   │   │  AddDevicePage   │
      │                 │    │                   │   │                  │
      │  StatCard ×4    │    │  FilterBar        │   │  DeviceForm      │
      │  ChartByCat     │    │  DeviceTable      │   │  (listes dyna-   │
      │  ChartByEntity  │    │  Pagination       │   │   miques issues  │
      │  ChartByLoc     │    │                   │   │   de /api/ref/*) │
      │  TopOwners      │    │                   │   │                  │
      └─────────────────┘    └───────────────────┘   └──────────────────┘

      Lecture seule           Lecture + écriture        Lecture + écriture
      (agrégats stats)        (filtrée, paginée)        (formulaire)
```

### 6.4 Diagramme de séquence — Rendu conditionnel selon le rôle

Ce diagramme illustre comment le frontend adapte l'interface en fonction du rôle de l'utilisateur connecté, sans appel supplémentaire au backend.

```
Navigateur (React)                        AuthContext
      │                                        │
      │  Montage de DeviceTable                │
      │───────────────────────────────────────▶│
      │◀─────────────────── role = "user"      │
      │                                        │
      │  Rendu résultant :                     │
      │  ┌──────────────────────────┐          │
      │  │ DeviceRow                │          │
      │  │  - données en lecture    │          │
      │  │  - bouton Modifier : NON │          │
      │  │  - bouton Supprimer : NON│          │
      │  └──────────────────────────┘          │
      │                                        │
      │  Montage de DeviceTable                │
      │───────────────────────────────────────▶│
      │◀─────────────────── role = "admin"     │
      │                                        │
      │  Rendu résultant :                     │
      │  ┌──────────────────────────┐          │
      │  │ DeviceRow                │          │
      │  │  - données               │          │
      │  │  + [Modifier]  ──────────┼──▶ EditDeviceModal
      │  │  + [Supprimer] ──────────┼──▶ Confirmation
      │  └──────────────────────────┘       puis DELETE /api/devices/{id}
```

---

## 7. Modèle de données

### 7.1 Diagramme entité-relation (ERD)

```
┌──────────────┐     ┌──────────────────────────────────────────────────┐
│    users     │     │                     devices                       │
├──────────────┤     ├──────────────────────────────────────────────────┤
│ id      PK   │◀────┤ id              PK                                │
│ username     │     │ serial_number   UNIQUE NOT NULL                   │
│ email        │◀────┤ model_name      NOT NULL                          │
│ password_hash│◀────┤ generation      nullable                          │
│ role (ENUM)  │     │ category_id     FK → categories                  │
│ is_active    │     │ entity_id       FK → entities                    │
│ created_at   │     │ order_number    nullable (Zurich uniquement)      │
└──────────────┘     │ location_id     FK → locations                   │
      ▲              │ owner_id        FK → users                        │
      │              │ client_id       FK → clients   (nullable)         │
      │              │ is_pv           BOOLEAN DEFAULT false             │
      │              │ cpu             nullable                          │
      │              │ ram_gb          nullable                          │
      │              │ storage_gb      nullable                          │
      │              │ screen_size     nullable                          │
      │              │ power_w         nullable                          │
      │              │ comment         nullable                          │
      │              │ is_archived     BOOLEAN DEFAULT false             │
      │              │ created_by      FK → users                        │
      │              │ updated_by      FK → users (nullable)             │
      │              │ created_at      TIMESTAMP                         │
      │              │ updated_at      TIMESTAMP                         │
      │              └──────────────┬───────────────────────────────────┘
      │                             │ 1
      │                             │ N
      │              ┌──────────────▼──────────────────────────────────┐
      └──────────────┤              device_history                      │
                     ├─────────────────────────────────────────────────┤
                     │ id              PK                               │
                     │ device_id       FK → devices                     │
                     │ user_id         FK → users                       │
                     │ field_changed   VARCHAR (ex: "location_id")      │
                     │ old_value       TEXT                             │
                     │ new_value       TEXT                             │
                     │ changed_at      TIMESTAMP                        │
                     └─────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  categories  │     │   entities   │     │  locations   │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id      PK   │     │ id      PK   │     │ id      PK   │
│ name         │     │ name         │     │ name         │
│ (Laptop,     │     │ (GVA,Zurich, │     │ (Stock,      │
│  Desktop...) │     │  CDS, FIX)   │     │  Showroom...) │
└──────────────┘     │ has_order_num│     └──────────────┘
                     └──────────────┘

┌──────────────┐
│   clients    │
├──────────────┤
│ id      PK   │
│ name         │
│ contact      │
│ sent_date    │
└──────────────┘
```

### 7.2 Description des tables

**Table `entities`** — Sources des appareils

| Valeur | Description | order_number |
|---|---|---|
| GVA | Bureau principal | Non |
| Zurich | Bureau de Zurich | Oui |
| CDS | Entité CDS | Non |
| FIX | Entité FIX | Non |

**Table `categories`** — Types de matériel

Laptop, Desktop, Mobile Workstation, Workstation, Display, Docking, Thin Client, Peripheral

**Table `locations`** — Emplacements des devices

Stock, Showroom, Client, Test, 5ème, Smart Locker

**Table `clients`** — Partenaires et clients externes

| Champ | Description |
|---|---|
| name | Nom du client (ex: Wella, UEFA, MIB, Rolex) |
| contact | Personne de contact chez le client |
| sent_date | Date d'envoi du ou des devices |

**Table `devices`** — Table centrale — un enregistrement par appareil physique

| Champ | Obligatoire | Notes |
|---|---|---|
| serial_number | Oui | Identifiant unique physique — clé naturelle |
| model_name | Oui | Nom complet du modèle HP |
| generation | Non | G1i, G1a, G6, G9… |
| category_id | Oui | FK vers categories |
| entity_id | Oui | FK vers entities (GVA/Zurich/CDS/FIX) |
| order_number | Non | Uniquement si entity = Zurich |
| location_id | Oui | FK vers locations |
| owner_id | Oui | FK vers users (responsable interne) |
| client_id | Non | FK vers clients — renseigné si location = Client |
| is_pv | Non | Demo unit / Proof of Value |
| cpu | Non | Renseigné pour Laptop / Desktop / Workstation |
| ram_gb | Non | Renseigné pour Laptop / Desktop / Workstation |
| storage_gb | Non | Renseigné pour Laptop / Desktop / Workstation |
| screen_size | Non | Renseigné pour Display (pouces) |
| power_w | Non | Renseigné pour Docking (watts) |
| comment | Non | Notes libres |
| is_archived | Non | Suppression logique (device hors service) |

**Table `device_history`** — Traçabilité complète de chaque modification

Chaque modification d'un device génère automatiquement une ligne dans cette table avec : le champ modifié, l'ancienne valeur, la nouvelle valeur, l'utilisateur ayant effectué l'action, et l'horodatage exact.

---

## 8. Sécurité et gestion des accès

### 8.1 Matrice des droits

| Action | Visiteur | Utilisateur | Administrateur |
|---|:---:|:---:|:---:|
| Accéder au login | ✓ | ✓ | ✓ |
| Voir le dashboard | ✗ | ✓ | ✓ |
| Voir l'inventaire | ✗ | ✓ | ✓ |
| Ajouter un device | ✗ | ✓ | ✓ |
| Modifier un device | ✗ | ✗ | ✓ |
| Supprimer un device | ✗ | ✗ | ✓ |
| Gérer les utilisateurs | ✗ | ✗ | ✓ |

### 8.2 Mécanisme d'authentification JWT

```
1. Connexion
   POST /api/auth/login  { username, password }
   → API vérifie hash bcrypt en base
   → API génère token JWT signé :
     { "sub": user_id, "role": "admin", "exp": now + 8h }
   → Token renvoyé au navigateur

2. Requêtes authentifiées
   Authorization: Bearer <token>  (en-tête HTTP)

3. Vérification côté API (à chaque requête)
   → Décode le token avec la clé secrète (stockée dans .env)
   → Vérifie l'expiration
   → Vérifie le rôle requis pour l'action
   → 200 OK / 401 Unauthorized / 403 Forbidden
```

### 8.3 HTTPS en réseau local

- Certificat SSL **auto-signé**, généré sur la VM avec OpenSSL
- Configuré dans Nginx pour le domaine interne (ex: `stock.entreprise.local`)
- Avertissement navigateur au premier accès → exception de sécurité à ajouter une seule fois par poste
- Alternative recommandée : utiliser la CA d'entreprise si elle existe pour éviter les avertissements

---

## 9. Plan d'action et phases de développement

### 9.1 Vue d'ensemble

```
Phase 0 │ Préparation infrastructure           │ S1
Phase 1 │ Base de données et migration données  │ S2–S3
Phase 2 │ Backend API (FastAPI)                │ S3–S4
Phase 3 │ Frontend React (3 pages)             │ S4–S6
Phase 4 │ Sécurité, tests et déploiement       │ S7
Phase 5 │ Documentation et formation           │ S8
──────────────────────────────────────────────────────
Total                                          │ ~8 semaines
```

### 9.2 Détail des phases

#### Phase 0 — Infrastructure (S1)
- [ ] Provisionner la VM Linux (Debian 13 / Trixie)
- [ ] Installer Docker et Docker Compose
- [ ] Configurer le pare-feu VM (port 443 uniquement ouvert sur le LAN)
- [ ] Définir le nom d'hôte interne (ex: `stock.entreprise.local`)
- [ ] Générer le certificat SSL auto-signé
- [ ] Définir et mettre en place la stratégie de backup du volume PostgreSQL

#### Phase 1 — Base de données et migration (S2–S3)
- [ ] Créer le schéma PostgreSQL (7 tables)
- [ ] Peupler les tables de référence (categories, entities, locations)
- [ ] Développer le script de migration depuis le fichier Excel existant
- [ ] Valider les données migrées (doublons S/N, champs manquants, clients à créer)
- [ ] Créer les comptes utilisateurs initiaux (owners existants)

#### Phase 2 — Backend API FastAPI (S3–S4)
- [ ] Mettre en place le projet FastAPI + SQLAlchemy + Alembic
- [ ] Développer les modèles ORM et schémas Pydantic
- [ ] Implémenter AuthRouter
- [ ] Implémenter DeviceRouter (CRUD + historique)
- [ ] Implémenter StatsRouter
- [ ] Implémenter ReferenceRouter (listes pour les formulaires)
- [ ] Implémenter UserRouter
- [ ] Tester tous les endpoints

#### Phase 3 — Frontend React (S4–S6)
- [ ] Mettre en place le projet React avec React Router
- [ ] Développer AuthContext (gestion token JWT et rôle)
- [ ] Développer les composants partagés (NavBar, Button, Modal, Toast, Loader…)
- [ ] Développer LoginPage
- [ ] Développer DashboardPage (StatCards + 3 graphiques + tableau owners)
- [ ] Développer InventoryPage (tableau + filtres + pagination)
- [ ] Développer la logique d'édition admin (modal)
- [ ] Développer AddDevicePage (formulaire dynamique selon catégorie et entité)
- [ ] Implémenter ProtectedRoute et rendu conditionnel selon rôle

#### Phase 4 — Sécurité, tests et déploiement (S7)
- [ ] Auditer tous les endpoints API (contrôle de rôle systématique)
- [ ] Vérifier la configuration HTTPS Nginx
- [ ] Tests fonctionnels complets (scénarios user et admin)
- [ ] Tester la persistance des données (redémarrage des containers)
- [ ] Déploiement sur la VM de production
- [ ] Vérification de l'accès depuis différents postes du LAN
- [ ] Validation avec un groupe pilote

#### Phase 5 — Documentation et formation (S8)
- [ ] Guide utilisateur (captures d'écran, procédures)
- [ ] Guide administrateur (gestion des comptes, backups)
- [ ] Documentation de déploiement et maintenance (équipe IT)
- [ ] Formation des utilisateurs finaux

---

## 10. Risques et points d'attention

| Risque | Probabilité | Impact | Mitigation |
|---|:---:|:---:|---|
| Perte de données (container supprimé) | Faible | Critique | Volume Docker persistant + backup quotidien automatique |
| Indisponibilité de la VM | Moyenne | Élevé | Procédure de redémarrage documentée (`docker compose up -d`) |
| Avertissement HTTPS sur les navigateurs | Élevée | Faible | Formation utilisateurs ou certificat CA interne |
| Numéro de série dupliqué à la migration | Moyenne | Moyen | Script de migration avec détection des doublons avant import |
| Données incomplètes dans le fichier Excel | Élevée | Faible | Champs nullable en base, complétion progressive |
| Accès non autorisé depuis le réseau | Faible | Élevé | Pare-feu VM : seul port 443 ouvert, PostgreSQL jamais exposé |
| Dépassement de capacité disque | Faible | Moyen | Monitoring de l'espace disque, archivage des anciens historiques |
| Perte du secret JWT | Très faible | Élevé | Stocké dans `.env` sécurisé, jamais versionné dans git |

---

## 11. Glossaire

| Terme | Définition |
|---|---|
| **LAN** | Local Area Network — réseau local de l'entreprise |
| **Docker / Container** | Environnement d'exécution isolé et reproductible |
| **Docker Compose** | Outil pour orchestrer plusieurs containers en une commande |
| **FastAPI** | Framework Python pour créer des APIs web performantes |
| **React** | Bibliothèque JavaScript pour construire des interfaces dynamiques |
| **PostgreSQL** | Système de gestion de base de données relationnelle open source |
| **Nginx** | Reverse proxy gérant le SSL et le routage des requêtes |
| **JWT** | JSON Web Token — authentification stateless par token signé |
| **HTTPS** | HTTP sécurisé avec chiffrement SSL/TLS |
| **SSL auto-signé** | Certificat de sécurité généré localement sans validation externe |
| **ORM** | Object Relational Mapping — couche d'abstraction entre le code Python et la base de données |
| **Pydantic** | Bibliothèque Python de validation de données par schémas typés |
| **bcrypt** | Algorithme de hachage sécurisé pour stocker les mots de passe |
| **RBAC** | Role-Based Access Control — gestion des droits par rôle utilisateur |
| **FK** | Foreign Key — clé étrangère reliant deux tables |
| **Nullable** | Champ pouvant être vide (non obligatoire) |
| **PV** | Proof of Value — appareil utilisé comme démonstrateur |
| **S/N** | Serial Number — numéro de série unique identifiant un appareil physique |
| **Entity** | L'une des quatre sources d'un appareil : GVA, Zurich, CDS ou FIX |
| **Owner** | Collaborateur interne responsable d'un appareil |
| **HOC** | Higher Order Component — composant React encapsulant un autre pour ajouter un comportement |
| **Alembic** | Outil de migration de schéma de base de données pour SQLAlchemy |

---

*Document préparé dans le cadre du projet de gestion de stock LAN — Version 2.0*
*Ce document est destiné à la présentation aux parties prenantes et ne contient aucun code source.*
