const { prisma } = require('./config/prismaClient');
const bcrypt = require('bcryptjs');
const { logAuditAction } = require('./services/auditLogService');

async function benchmark() {
  await prisma.$connect();
  const superAdmin = await prisma.user.findFirst({ where: { role: 'SuperAdmin' } });

  console.log('--- OLD FLOW ---');
  const tOldStart = Date.now();
  const userOld = await prisma.user.findUnique({ where: { id: superAdmin.id } });
  const isMatchOld = await bcrypt.compare('SuperAdminPassword123!', userOld.password);
  const hashOld = await bcrypt.hash('SuperAdminPassword123!', 10);
  await prisma.user.update({ where: { id: userOld.id }, data: { password: hashOld } });
  await logAuditAction({ id: superAdmin.id, name: superAdmin.name, role: superAdmin.role }, 'CHANGE_PASSWORD', 'User', userOld.id, 'test');
  const tOldEnd = Date.now();
  console.log(`Old flow duration: ${tOldEnd - tOldStart} ms`);

  console.log('\n--- NEW OPTIMIZED FLOW ---');
  const tNewStart = Date.now();
  const hashPromise = bcrypt.hash('SuperAdminPassword123!', 10);
  const userNew = await prisma.user.findUnique({
    where: { id: superAdmin.id },
    select: { id: true, password: true, name: true, role: true, organizationId: true }
  });
  const isMatchNew = await bcrypt.compare('SuperAdminPassword123!', userNew.password);
  const hashNew = await hashPromise;
  await prisma.user.update({ where: { id: userNew.id }, data: { password: hashNew } });
  logAuditAction({ id: superAdmin.id, name: superAdmin.name, role: superAdmin.role }, 'CHANGE_PASSWORD', 'User', userNew.id, 'test').catch(() => {});
  const tNewEnd = Date.now();
  console.log(`New optimized flow duration: ${tNewEnd - tNewStart} ms`);

  await prisma.$disconnect();
}

benchmark().catch(console.error);
