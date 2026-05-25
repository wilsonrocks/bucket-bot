#!/bin/bash
set -ex
pwd
echo "Building site for production..."
npx kysely-codegen --out-file src/db.d.ts
npx vite build
