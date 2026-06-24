#!/bin/bash
set -euo pipefail

# Domaine interne servi par l'Ingress Traefik (doit correspondre au host de
# k8s/ingress.yaml et à l'enregistrement DNS du contrôleur de domaine).
DOMAIN="stock.gvaprintlab.ch"
CERT_DIR="$(dirname "$0")/certs"

mkdir -p "$CERT_DIR"
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -subj "/CN=$DOMAIN" \
  -addext "subjectAltName=DNS:$DOMAIN"
