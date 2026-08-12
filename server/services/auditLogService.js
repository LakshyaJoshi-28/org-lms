const AuditLog = require('../models/AuditLog');

const logAuditAction = async (user, action, targetType = null, targetId = null, details = '') => {
  try {
    if (!user) return;

    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      organizationId: user.organizationId,
      action,
      targetType,
      targetId,
      details
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
};

module.exports = {
  logAuditAction
};
