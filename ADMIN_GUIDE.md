# Guide Administrateur - Gestion de Stock

En tant qu'administrateur du parc matériel local, vous disposez des droits les plus élevés sur l'interface (dite de modification), en plus d'une responsabilité associée à la gestion opérationnelle de la base et du backend.

## 1. Gestion des Utilisateurs et Rôles

Actuellement, l'architecture permet deux dimensions de droits (Utilisateur standard & Administrateur). En V1, il est courant de ne pas avoir de console web UI pour modifier ou créer brutalement des accès pour de nouveaux employés. Ceux-ci se font directement dans la base de données ou scripts de bootstrap.

Pour générer un nouveau compte ou modifier un utilisateur à la racine (sur la VM d'accueil de Docker) :
```bash
docker compose exec backend python -c "
from database import SessionLocal
from models import User, UserRole
from security import hash_password

db = SessionLocal()
new_admin = User(
    username='admin_nom',
    email='admin@entreprise.com',
    password_hash=hash_password('MotDePasseTresSecurise'),
    role=UserRole.admin
)
db.add(new_admin)
db.commit()
print('Utilisateur créé avec succès !')
"
```
Vous pouvez utiliser la même méthodologie et appeler la commande `db.query(User).filter(...)` pour ajuster un mot de passe perdu par un collaborateur.

## 2. Modifications et Suppressions d'Appareils (via Interface)

Outre les fonctions de l'utilisateur standard, vous bénéficiez de nouveaux droits au sein de l'onglet **Inventaire** :

- **Éditer/Modifier un Appareil** : Une icône d'édition vous permet d'ajuster une fiche erronée. Typiquement pour actualiser la **Localisation** d'un poste ou de consigner en *comment* qu'un ordinateur passe d'un état Stock vers un client.
- **Supprimer un Appareil (ou désactiver)** : En cas de casse ou changement hors de trace, vous possédez dans le tableau la capacité à retirer complétement l'information (ou activer un booléen d'archivage). Une trace d'historique `DeviceHistoryModel` (en backend) journalise les différents comportements sur un produit.

## 3. Consultations des Logs Applicatifs

En cas de comportements anormaux, d'échecs de requêtes ou de lenteurs non anticipées, vous allez devoir auditer les logs des services via le terminal du serveur.

**Consulter les logs de la Base de Données (PostgreSQL) :**
```bash
docker compose logs --tail=100 -f db
# Idéal pour détecter des crash ou erreurs de syntaxe (IntegrityError).
```

**Consulter les logs API Backend (FastAPI) :**
```bash
docker compose logs --tail=100 -f backend
# Affiche une pile de requêtes REST (200 OK, 401 Unauthorized, etc), incluant les potentiels bugs serveurs loggés.
```

**Consulter le Reverse Proxy (Nginx) :**
```bash
docker compose logs -f nginx
# Aide à diagnostiquer les blocages réseaux d'accès HTTPS internes et soucis TLS.
```
*Quittez la consultation live via `CTRL + C`.*