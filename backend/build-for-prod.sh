#!/bin/bash
set -ex
pwd
echo "Building backend for production..."
npx kysely-codegen
npx tsc
cp package*.json dist
cd dist
echo 'removing previous dependencies...'
rm -rf node_modules
echo "Installing production dependencies..."
npm ci
