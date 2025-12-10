#!/bin/bash
set -e
echo "Building backend for production..."
npx tsc
cp package*.json dist
cd dist
mkdir -p certs
echo "Copying CA certificate..."
cp ../../certs/ca.pem certs
echo "Installing production dependencies..."
npm ci
