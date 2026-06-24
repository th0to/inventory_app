#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Mise à jour de l'application sur la VM k3s.
#
# Enchaîne : git pull -> build des images -> import dans containerd (k3s) ->
# redémarrage des déploiements. Ne touche NI au namespace NI aux PVC : les
# données PostgreSQL sont préservées.
#
# Usage (depuis la racine du dépôt sur la VM) :
#   ./update.sh            # met à jour backend ET frontend
#   ./update.sh backend    # uniquement le backend
#   ./update.sh frontend   # uniquement le frontend
# ---------------------------------------------------------------------------
set -euo pipefail

NAMESPACE="inventory-app"
TARGET="${1:-all}"   # all | backend | frontend
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

build_backend() {
  echo "==> Build image backend"
  docker build -t inventory-backend:latest ./backend
  docker save inventory-backend:latest | sudo k3s ctr images import -
}

build_frontend() {
  echo "==> Build image frontend"
  docker build -t inventory-frontend:latest --build-arg VITE_API_URL=/api ./frontend
  docker save inventory-frontend:latest | sudo k3s ctr images import -
}

echo "==> Récupération du code (git pull --ff-only origin main)"
git pull --ff-only origin main

case "$TARGET" in
  backend)
    build_backend
    kubectl rollout restart deployment/backend -n "$NAMESPACE"
    kubectl rollout status  deployment/backend -n "$NAMESPACE" --timeout=180s
    ;;
  frontend)
    build_frontend
    kubectl rollout restart deployment/frontend -n "$NAMESPACE"
    kubectl rollout status  deployment/frontend -n "$NAMESPACE" --timeout=180s
    ;;
  all)
    build_backend
    build_frontend
    kubectl rollout restart deployment/backend deployment/frontend -n "$NAMESPACE"
    kubectl rollout status   deployment/backend  -n "$NAMESPACE" --timeout=180s
    kubectl rollout status   deployment/frontend -n "$NAMESPACE" --timeout=180s
    ;;
  *)
    echo "Cible inconnue : '$TARGET' (attendu : all | backend | frontend)" >&2
    exit 1
    ;;
esac

echo "✅ Mise à jour terminée."
kubectl get pods -n "$NAMESPACE"
