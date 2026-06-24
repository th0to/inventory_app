#!/bin/bash
mkdir -p "$(dirname "$0")/certs"
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$(dirname "$0")/certs/key.pem" \
  -out "$(dirname "$0")/certs/cert.pem" \
  -subj "/CN=stock.gvaprintlab.ch"
