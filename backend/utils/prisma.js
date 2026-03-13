const { PrismaClient } = require('@prisma/client');

// Prisma client singleton to prevent multiple instances
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, use a global variable to preserve the instance across hot reloads
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = global.prisma;
}

module.exports = prisma;
