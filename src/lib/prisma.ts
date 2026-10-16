import { PrismaClient } from '@prisma/client';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Em ambiente Node.js sem WebSocket nativo, injetamos ws se necessário
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    // No Cloudflare Workers (workerd) e serverless edge, o adapter HTTP (PrismaNeonHTTP)
    // executa queries via fetch HTTP sem manter pools/sockets WebSocket persistentes entre requisições.
    // Isso elimina o erro fatal: "Cannot perform I/O on behalf of a different request".
    // Funciona de forma transparente tanto no Cloudflare quanto no Node.js local.
    const adapter = new PrismaNeonHTTP(connectionString, {});
    return new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    });
  }

  return new PrismaClient({
    log: ['error', 'warn'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

