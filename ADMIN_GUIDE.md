# Guide Administrateur - Gestion de Stock

En tant qu'administrateur du parc matériel local, vous disposez des droits les plus élevés sur l'interface (dite de modification), en plus d'une responsabilité associée à la gestion opérationnelle de la base et du backend.

## 1. Gestion des Utilisateurs et Rôles

La gestion des comptes se fait désormais **depuis l'interface web**, via l'onglet
**Comptes** de la barre de navigation (visible uniquement pour les administrateurs).

Depuis cette page vous pouvez :

- **Lister** tous les comptes (nom d'utilisateur, email, rôle, statut actif/inactif) ;
- **Créer** un compte : renseignez nom d'utilisateur, email, mot de passe initial et
  rôle (`user` par défaut, ou `admin`). Le mot de passe est hashé côté serveur ;
  communiquez-le manuellement à l'utilisateur ;
- **Modifier** un compte (icône crayon) : changer le rôle, activer/désactiver, et
  réinitialiser le mot de passe (laisser le champ vide pour ne pas le changer) ;
- **Désactiver** un compte (icône corbeille) : le compte ne peut plus se connecter.

> **Désactivation plutôt que suppression** : « supprimer » un compte le passe en
> `is_active = false` (désactivation logique). La suppression définitive en base est
> volontairement écartée car les appareils référencent leur propriétaire / créateur
> (`devices.owner_id`, `created_by`, `updated_by`) et l'historique (`device_history.user_id`) :
> une suppression dure violerait ces contraintes. Pour réactiver un compte désactivé,
> ré-éditez-le et cochez « Actif ».
>
> Garde-fou : un administrateur ne peut ni se désactiver ni se supprimer lui-même.

### Alternative en ligne de commande (si l'interface est inaccessible)

En cas de problème d'accès à l'interface (ex. plus aucun admin actif), vous pouvez
créer/réparer un compte directement dans le conteneur backend :
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
    role=UserRole.ADMIN,
)
db.add(new_admin)
db.commit()
print('Utilisateur créé avec succès !')
"
```
La même méthode avec `db.query(User).filter(...)` permet d'ajuster un mot de passe
perdu par un collaborateur.

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