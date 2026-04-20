import { PrismaClient } from "@/lib/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

let client: PrismaClient | null = null;

export function getPrismaTest(): PrismaClient {
  if (!client) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    client = new PrismaClient({ adapter });
  }
  return client;
}
