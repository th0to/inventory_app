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
- **Modifier** un compte (icône crayon) : changer l'**adresse e-mail**, le rôle,
  activer/désactiver, et réinitialiser le mot de passe (laisser le champ vide pour ne pas
  le changer). L'e-mail doit rester unique ;
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
créer/réparer un compte directement dans le Pod backend :
```bash
kubectl exec -n inventory-app deploy/backend -- python -c "
from database import SessionLocal
from models import User, UserRole
from security import hash_password

db = SessionLocal()
new_admin = User(
    username='admin_nom',
    email='admin@gvaprintlab.ch',
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

Dans l'onglet **Inventaire**, chaque ligne dispose (pour les administrateurs uniquement)
de deux actions à droite — les utilisateurs standard ne les voient pas :

- **Modifier** (icône crayon) : ouvre une **fenêtre d'édition** reprenant le formulaire
  complet, **pré-rempli** avec les valeurs actuelles. Vous pouvez ajuster toutes les
  informations d'**affectation** (entité, lieu, propriétaire, client/partenaire, n° de
  commande, PV) et de **caractéristiques** (CPU, RAM, stockage, taille d'écran, puissance,
  commentaire), ainsi que l'identité (n° de série, modèle, génération, catégorie). Les
  champs proposés s'adaptent à la catégorie/au lieu (ex. la taille d'écran n'apparaît que
  pour un *Display*). Cliquez sur **Enregistrer les modifications** ; fermez sans
  enregistrer via la croix, un clic à l'extérieur ou la touche **Échap**.
  > Chaque champ modifié est journalisé dans l'historique (`device_history` : champ,
  > ancienne valeur, nouvelle valeur, auteur, horodatage).

- **Supprimer** (icône corbeille) : une **fenêtre de confirmation** s'affiche avant toute
  suppression. La suppression est **définitive** (l'appareil et son historique sont
  retirés de la base) — à utiliser en cas de saisie en double ou de matériel sorti
  définitivement du parc.

> **Astuce client/partenaire** : le champ *Client / Partenaire* est libre. S'il
> correspond à un client déjà connu (même nom), il est réutilisé ; sinon il est créé
> automatiquement.

## 3. Consultations des Logs Applicatifs

En cas de comportements anormaux, d'échecs de requêtes ou de lenteurs non anticipées, vous allez devoir auditer les logs des Pods via `kubectl` sur le nœud k3s.

**Consulter les logs de la Base de Données (PostgreSQL) :**
```bash
kubectl logs -n inventory-app statefulset/postgres --tail=100 -f
# Idéal pour détecter des crash ou erreurs de syntaxe (IntegrityError).
```

**Consulter les logs API Backend (FastAPI) :**
```bash
kubectl logs -n inventory-app deploy/backend --tail=100 -f
# Affiche une pile de requêtes REST (200 OK, 401 Unauthorized, etc), incluant les potentiels bugs serveurs loggés.
```

**Consulter l'Ingress (Traefik, terminaison TLS et routage) :**
```bash
kubectl logs -n kube-system -l app.kubernetes.io/name=traefik --tail=100 -f
# Aide à diagnostiquer les blocages réseaux d'accès HTTPS internes et soucis TLS.
```
*Quittez la consultation live via `CTRL + C`.*

> Vue d'ensemble rapide de l'état des Pods : `kubectl get pods -n inventory-app`.

## 4. Mise à jour de l'application

Un script [`update.sh`](./update.sh) (à la racine du dépôt, sur la VM) automatise la mise
à jour **sans perdre les données** (il ne touche ni au namespace ni aux volumes PostgreSQL) :

```bash
cd ~/inventory_app
./update.sh            # met à jour backend ET frontend
./update.sh frontend   # uniquement le frontend (ex. changement d'UI)
./update.sh backend    # uniquement le backend
```

Le script enchaîne : `git pull` → build des images → import dans containerd (k3s) →
`kubectl rollout restart` → attente du redéploiement. Pensez ensuite à **Ctrl+F5** dans le
navigateur après une mise à jour du frontend.

> ⚠️ **Ne jamais** utiliser `kubectl delete -k k8s/` pour une simple mise à jour : cela
> supprime le namespace **et les volumes**, donc **efface la base de données**. La mise à
> jour passe toujours par `rollout restart` (ce que fait `update.sh`).

## 5. Réinitialiser les identifiants d'appareils (optionnel)

Les ID d'appareils sont des compteurs internes : après des suppressions/ré-imports, ils
peuvent ne plus commencer à 1 (sans incidence — le **numéro de série** reste l'identifiant
métier). Pour repartir d'une numérotation propre (⚠️ **vide les appareils et leur
historique**, conserve les comptes) :

```bash
PGPOD=$(kubectl get pod -n inventory-app -l app=postgres -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n inventory-app $PGPOD -- psql -U postgres -d stock \
  -c "TRUNCATE TABLE device_history, devices RESTART IDENTITY CASCADE;"

POD=$(kubectl get pod -n inventory-app -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl cp ~/inventory_app/BD_inventory.csv inventory-app/$POD:/tmp/BD_inventory.csv
kubectl exec -n inventory-app $POD -- python import_csv.py /tmp/BD_inventory.csv
```