const { prisma } = require('./prismaClient');

const connectDB = async (maxRetries = 3, delayMs = 1500) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect();
      console.log('PostgreSQL (Prisma / Neon) Connected successfully');
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`PostgreSQL Connection Error: ${error.message}`);
        throw error;
      }
      console.log(`Neon compute node spinning up (Attempt ${attempt}/${maxRetries}), retrying in ${delayMs / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};

module.exports = connectDB;
