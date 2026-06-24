# Déploiement Kubernetes (k3s mono-nœud)

Guide de déploiement de l'application d'inventaire sur un cluster **k3s mono-nœud**
(VM de production en LAN, sans accès Internet direct, HTTPS interne obligatoire).

Tous les manifestes sont dans le dossier [`k8s/`](k8s/). Architecture :

```
                    Ingress Traefik (443, TLS)
                    host: stock.gvaprintlab.ch
                      /                     \
              /api -> backend-service:8000   / -> frontend-service:80
                       |                              |
                 Deployment backend            Deployment frontend
                       |
                 postgres-service:5432 (headless)
                       |
                 StatefulSet postgres + PVC (local-path)
```

---

## 1. Prérequis VM et installation de k3s

La VM est **provisionnée manuellement** (pas de Terraform/cloud-init) :

1. **Installer Debian 13 (Trixie)** sur la VM Proxmox via l'ISO standard.
   Dimensionnement recommandé : **4 vCPU / 8 Go RAM / 60–80 Go de disque**
   (cohérent avec le budget ressources des workloads, cf. §8).
2. **Configurer l'accès SSH** (clé publique de l'admin, `sudo` disponible).
3. **Installer k3s** (inclut Traefik comme Ingress Controller — ne pas le désactiver) :

   ```bash
   curl -sfL https://get.k3s.io | sh -
   ```

4. **Vérifier** que le nœud est prêt :

   ```bash
   sudo k3s kubectl get nodes      # ou : kubectl get nodes
   # Le nœud doit apparaître en STATUS "Ready".
   ```

5. **Configurer `kubectl`** sans `sudo` (k3s écrit son kubeconfig dans
   `/etc/rancher/k3s/k3s.yaml`) :

   ```bash
   mkdir -p ~/.kube && sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
   sudo chown "$(id -u):$(id -g)" ~/.kube/config
   ```

Sur la machine de build, il faut aussi **`docker`** (ou `nerdctl`) pour construire les
images (§2) et **`openssl`** pour le certificat TLS (§3.3).

---

## 2. Construire et importer les images

Les images ne viennent pas d'un registre : on les construit localement puis on les
importe dans le containerd de k3s (`imagePullPolicy: IfNotPresent` dans les manifestes).

```bash
# Depuis la racine du repo
docker build -t inventory-backend:latest ./backend
docker build -t inventory-frontend:latest --build-arg VITE_API_URL=/api ./frontend

# Import dans k3s (containerd)
docker save inventory-backend:latest  | sudo k3s ctr images import -
docker save inventory-frontend:latest | sudo k3s ctr images import -
```

> À refaire à chaque nouvelle version d'image (puis `kubectl rollout restart deploy/backend -n inventory-app`).

---

## 3. Créer le namespace et les Secrets (première fois)

Le namespace doit exister **avant** de créer les Secrets. Les Secrets ne sont **jamais
versionnés** (cf. [`k8s/secrets.example.yaml`](k8s/secrets.example.yaml) qui n'est qu'un gabarit).

```bash
# 3.1 Namespace
kubectl apply -f k8s/namespace.yaml

# 3.2 Secret applicatif (DB + JWT). Clés nommées comme les variables d'env du backend.
kubectl create secret generic inventory-secrets -n inventory-app \
  --from-literal=DB_USER=postgres \
  --from-literal=DB_PASSWORD="$(openssl rand -hex 16)" \
  --from-literal=JWT_SECRET_KEY="$(openssl rand -hex 32)"

# 3.3 Certificat TLS auto-signé (CN=stock.gvaprintlab.ch).
#     Les .pem ne sont PAS versionnés (clé privée) : régénérez-les localement après
#     un clone frais, puis créez le Secret. Renouvellement manuel annuel.
./nginx/generate_certs.sh
kubectl create secret tls inventory-tls -n inventory-app \
  --cert=nginx/certs/cert.pem \
  --key=nginx/certs/key.pem
```

> Notez le `DB_PASSWORD` généré : il doit rester cohérent entre Postgres et le backend
> (ils lisent tous deux le même Secret, donc c'est automatique). Si vous recréez le
> Secret après le premier démarrage de Postgres, le mot de passe en base ne change pas
> tout seul — supprimez le PVC pour repartir propre, ou changez-le dans Postgres.

---

## 4. Déployer les workloads

```bash
kubectl apply -k k8s/
```

Cela applique : namespace, ConfigMap, StatefulSet Postgres (+ Service + PVC),
Deployment backend (+ Service), Deployment frontend (+ Service), Ingress.

> Ordre : `kubectl apply -k` gère les dépendances par retry. Si le backend redémarre
> une ou deux fois au tout début (le temps que Postgres soit prêt pour `alembic upgrade
> head`), c'est normal — le `startupProbe` couvre la fenêtre de migration.

---

## 5. Vérifier que tout tourne

```bash
kubectl get pods -n inventory-app
kubectl get pvc,svc,ingress -n inventory-app

# Logs
kubectl logs -n inventory-app deploy/backend
kubectl logs -n inventory-app statefulset/postgres

# Santé backend (depuis l'intérieur du cluster)
kubectl exec -n inventory-app deploy/backend -- python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health').read())"
```

Accès navigateur : faites pointer **`stock.gvaprintlab.ch`** vers l'IP du nœud k3s
(DNS interne ou `/etc/hosts` des postes clients), puis ouvrez `https://stock.gvaprintlab.ch`.
Le certificat étant auto-signé, acceptez l'avertissement (ou importez le CA dans les postes).

---

## 6. Importer les données CSV

Équivalent de l'ancien `docker compose exec backend python import_csv.py ...` :

```bash
# Récupérer le nom du Pod backend
POD=$(kubectl get pod -n inventory-app -l app=backend -o jsonpath='{.items[0].metadata.name}')

# Copier le CSV dans le Pod
kubectl cp BD_inventory.csv inventory-app/$POD:/tmp/BD_inventory.csv

# Vérification à blanc d'abord
kubectl exec -n inventory-app $POD -- python import_csv.py /tmp/BD_inventory.csv --dry-run

# Import réel (idempotent)
kubectl exec -n inventory-app $POD -- python import_csv.py /tmp/BD_inventory.csv
```

> Le fichier `imported_accounts_<timestamp>.log` (mots de passe des comptes créés) est
> écrit dans le conteneur : récupérez-le avec `kubectl cp inventory-app/$POD:/app/imported_accounts_<...>.log ./`
> puis supprimez-le du Pod.

---

## 7. Test de bout en bout en local (avant la vraie VM)

Avec **k3d** (k3s dans Docker), pour valider les manifestes sans la VM de prod :

```bash
# Cluster local avec ports 80/443 mappés sur localhost
k3d cluster create inventory -p "80:80@loadbalancer" -p "443:443@loadbalancer"

# Build + import des images dans le cluster k3d
docker build -t inventory-backend:latest ./backend
docker build -t inventory-frontend:latest --build-arg VITE_API_URL=/api ./frontend
k3d image import inventory-backend:latest inventory-frontend:latest -c inventory

# Secrets + déploiement (mêmes commandes qu'aux sections 3 et 4)
kubectl apply -f k8s/namespace.yaml
kubectl create secret generic inventory-secrets -n inventory-app \
  --from-literal=DB_USER=postgres \
  --from-literal=DB_PASSWORD="$(openssl rand -hex 16)" \
  --from-literal=JWT_SECRET_KEY="$(openssl rand -hex 32)"
./nginx/generate_certs.sh   # régénère le cert (non versionné) si absent
kubectl create secret tls inventory-tls -n inventory-app \
  --cert=nginx/certs/cert.pem --key=nginx/certs/key.pem
kubectl apply -k k8s/

# Ajouter 127.0.0.1 stock.gvaprintlab.ch dans /etc/hosts, puis :
curl -k https://stock.gvaprintlab.ch/api/health   # -> {"status":"ok"}

# Nettoyage
k3d cluster delete inventory
```

---

## 8. Budget ressources (cohérence VM 4 vCPU / 8 Go)

| Workload  | requests CPU / RAM | limits CPU / RAM |
|-----------|--------------------|------------------|
| Postgres  | 250m / 256Mi       | 1000m / 1Gi      |
| Backend   | 250m / 256Mi       | 1000m / 768Mi    |
| Frontend  | 50m / 64Mi         | 200m / 128Mi     |
| **Total** | **550m / 576Mi**   | **2200m / ~1.9Gi** |

En retirant ~1 vCPU / ~1 Go pour le control-plane k3s, il reste ~3 vCPU / ~7 Go : les
*requests* (0,55 vCPU / 0,56 Go) tiennent très largement, et la somme des *limits*
(2,2 vCPU / 1,9 Go) garde une marge confortable sous les pics.

---

## 9. Ce qui est volontairement gardé simple pour cette V1

- **1 replica partout** (Postgres, backend, frontend) : charge < 10 utilisateurs en LAN,
  pas de besoin de HA. *Évolution possible : plus de replicas backend/frontend + un
  Postgres en réplication si la charge augmente.*
- **Pas de cert-manager** : le certificat auto-signé existant est importé tel quel dans un
  Secret TLS, renouvellement manuel annuel. *Évolution : cert-manager avec une CA locale.*
- **Pas de GitOps / Sealed Secrets / SOPS** : Secrets créés à la main via `kubectl`, jamais
  versionnés. *Évolution : Sealed Secrets ou SOPS si un dépôt GitOps est mis en place.*
- **Kustomize minimal** (juste une liste de ressources) : pas d'overlays par environnement.
  *Évolution : overlays dev/prod si besoin.*
- **Images importées à la main** dans containerd : pas de registre privé. *Évolution :
  un registre local (`registry:2`) si les mises à jour deviennent fréquentes.*
- **Traefik par défaut de k3s** conservé (pas d'ingress-nginx) : suffisant pour le TLS +
  routing `/api` vs `/`.
- **Pas de redirection HTTP→HTTPS automatique** au niveau Ingress (l'ancien nginx la faisait) :
  l'accès se fait directement en `https://`. *Évolution : une Middleware Traefik
  `redirectScheme` si on veut forcer la redirection depuis le port 80.*
