const { prisma } = require('../config/prismaClient');

const logAuditAction = async (user, action, targetType = null, targetId = null, details = '') => {
  try {
    if (!user) return;

    const userId = user.id || user._id;
    const organizationId = user.organizationId ? (user.organizationId.id || user.organizationId._id || user.organizationId) : null;

    if (!userId || !organizationId) return;

    await prisma.auditLog.create({
      data: {
        userId: String(userId),
        userName: user.name,
        userRole: user.role,
        organizationId: String(organizationId),
        action,
        targetType: targetType ? String(targetType) : null,
        targetId: targetId ? String(targetId) : null,
        details
      }
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
};

module.exports = {
  logAuditAction
};
