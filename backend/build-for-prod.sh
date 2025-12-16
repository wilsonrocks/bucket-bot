#!/bin/bash
set -e
echo "Installing dependencies..."
npm ci
echo "Building backend for production..."
npx tsc
cp package*.json dist
cd dist
mkdir -p certs
echo "Copying CA certificate..."
cp ../../certs/ca.pem certs




# OLD:

# #!/bin/bash
# set -e
# echo 'Installing Typescript compiler...'
# npm install typescript
# echo "Building backend for production..."
# npx tsc
# cp package*.json dist
# cd dist
# mkdir -p certs
# echo "Copying CA certificate..."
# cp ../../certs/ca.pem certs
# echo 'removing previous dependencies...'
# rm -rf node_modules
# echo "Installing production dependencies..."
# npm ci
