#!/bin/bash
# Deploy frontend/dist to the S3 bucket created by CDK

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <bucket-name>"
  exit 1
fi

BUCKET_NAME="$1"
FRONTEND_DIST="../frontend/dist"

if [ ! -d "$FRONTEND_DIST" ]; then
  echo "Error: $FRONTEND_DIST does not exist. Build the frontend first."
  exit 1
fi

echo "Syncing $FRONTEND_DIST to s3://$BUCKET_NAME/ ..."
aws s3 sync "$FRONTEND_DIST" "s3://$BUCKET_NAME/" --delete

echo "Deployment complete."
