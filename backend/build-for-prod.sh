#!/bin/bash
set -e
echo "Building backend for production..."
mkdir -p dist/certs
echo "Copying CA certificate..."
cp ../certs/ca.pem dist/certs
npx kysely-codegen
npx tsc
cp package*.json dist
cd dist
echo 'removing previous dependencies...'
rm -rf node_modules
echo "Installing production dependencies..."
npm ci
