#!/bin/bash
set -ex
pwd
echo "Building backend for production..."
npx kysely-codegen
npx tsc
# tsc only emits JS; copy static files the code reads at runtime (e.g. Buried suit icons).
find logic -name '*.svg' -exec cp --parents {} dist/ \;
cp package*.json dist
cd dist
echo 'removing previous dependencies...'
rm -rf node_modules
echo "Installing production dependencies..."
npm ci
