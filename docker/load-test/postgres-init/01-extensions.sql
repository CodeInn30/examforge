-- Enable pgcrypto for UUID generation (used by Prisma default UUIDs)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
