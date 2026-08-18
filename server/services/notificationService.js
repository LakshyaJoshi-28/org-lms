const { prisma, withId } = require('../config/prismaClient');

/**
 * Send notification to a specific user (Employee or Instructor)
 */
const sendUserNotification = async (recipientId, organizationId, role, type, title, message, relatedEntity = null) => {
  try {
    const recId = recipientId ? String(recipientId.id || recipientId._id || recipientId) : null;
    const orgId = String(organizationId.id || organizationId._id || organizationId);

    const notification = await prisma.notification.create({
      data: {
        recipientId: recId,
        organizationId: orgId,
        role,
        type,
        title,
        message,
        relatedEntityType: relatedEntity?.entityType ? String(relatedEntity.entityType) : null,
        relatedEntityId: relatedEntity?.entityId ? String(relatedEntity.entityId.id || relatedEntity.entityId._id || relatedEntity.entityId) : null
      }
    });

    return withId(notification);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

/**
 * Send aggregated notification to all Organization Admins
 */
const sendAdminNotification = async (organizationId, type, title, message, relatedEntity = null) => {
  try {
    const orgId = String(organizationId.id || organizationId._id || organizationId);
    const admins = await prisma.user.findMany({
      where: { organizationId: orgId, role: 'Admin' }
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          recipientId: admin.id,
          organizationId: orgId,
          role: 'Admin',
          type,
          title,
          message,
          relatedEntityType: relatedEntity?.entityType ? String(relatedEntity.entityType) : null,
          relatedEntityId: relatedEntity?.entityId ? String(relatedEntity.entityId.id || relatedEntity.entityId._id || relatedEntity.entityId) : null
        }))
      });
    }
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }
};

module.exports = {
  sendUserNotification,
  sendAdminNotification
};
