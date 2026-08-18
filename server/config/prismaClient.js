require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

let prisma;

const createPrismaClient = () => {
  const baseClient = new PrismaClient({
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' }
    ]
  });

  baseClient.$on('error', (e) => {
    console.error(`[Prisma Database Error] [${new Date().toISOString()}] ${e.message}`);
  });

  baseClient.$on('warn', (e) => {
    console.warn(`[Prisma Database Warning] [${new Date().toISOString()}] ${e.message}`);
  });

  const extendedClient = baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          let attempts = 0;
          const maxRetries = 3;
          const retryDelays = [1000, 2000, 3000];

          while (true) {
            try {
              return await query(args);
            } catch (error) {
              const isTransientDbError = ['P1001', 'P1017', 'P2024'].includes(error.code);
              if (isTransientDbError && attempts < maxRetries) {
                const delay = retryDelays[attempts] || 2000;
                attempts++;
                console.warn(`[Prisma Auto-Reconnect Attempt ${attempts}/${maxRetries}] Transient DB error (${error.code}) on ${model}.${operation}. Refreshing connection and retrying in ${delay}ms...`);
                await baseClient.$connect().catch(() => {});
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
              }
              if (isTransientDbError) {
                console.error(`[Prisma Auto-Reconnect Exhausted] ${model}.${operation} failed after ${maxRetries} retries: ${error.message}`);
              }
              throw error;
            }
          }
        }
      }
    }
  });

  return extendedClient;
};

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = createPrismaClient();
  }
  prisma = global.prisma;
}

/**
 * Fast in-place object transformer to attach `_id` matching `id` for 100% frontend API contract compatibility.
 */
function withId(data) {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(withId);
  }
  if (typeof data === 'object') {
    if (data instanceof Date || Buffer.isBuffer(data)) return data;

    if (data.id !== undefined && data._id === undefined) {
      data._id = data.id;
    }

    for (const key of Object.keys(data)) {
      const val = data[key];
      if (val && typeof val === 'object' && !(val instanceof Date) && !Buffer.isBuffer(val)) {
        withId(val);
      }
    }
    return data;
  }
  return data;
}

module.exports = {
  prisma,
  withId
};
