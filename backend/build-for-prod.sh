#!/bin/bash
set -e
echo "Building backend for production..."
npx kysely-codegen
npx tsc
cp package*.json dist
cd dist
mkdir -p certs
echo "Copying CA certificate..."
cp ../../certs/ca.pem certs
echo 'removing previous dependencies...'
rm -rf node_modules
echo "Installing production dependencies..."
npm ci
