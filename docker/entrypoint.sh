#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
# Call prisma/build/index.js directly so __dirname resolves to the build dir
# where the .wasm files live (symlink via .bin loses this resolution).
DATABASE_URL="${DIRECT_DATABASE_URL:-$DATABASE_URL}" \
  node node_modules/prisma/build/index.js migrate deploy --schema=prisma/schema.prisma

echo "[entrypoint] Migrations complete. Starting Next.js..."
exec node server.js
