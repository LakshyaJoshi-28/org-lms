const { prisma, withId } = require('../config/prismaClient');
const { emitToUser, emitToRoom } = require('../config/socket');

const formatNotification = (n) => {
  if (!n) return null;
  const transformed = withId(n);
  transformed.relatedEntity = {
    entityType: n.relatedEntityType,
    entityId: n.relatedEntityId
  };
  return transformed;
};

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

    const formatted = formatNotification(notification);

    // Real-time emit to user room
    if (recId) {
      emitToUser(recId, 'new_notification', formatted);
    }

    return formatted;
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
      const records = admins.map((admin) => ({
        recipientId: admin.id,
        organizationId: orgId,
        role: 'Admin',
        type,
        title,
        message,
        relatedEntityType: relatedEntity?.entityType ? String(relatedEntity.entityType) : null,
        relatedEntityId: relatedEntity?.entityId ? String(relatedEntity.entityId.id || relatedEntity.entityId._id || relatedEntity.entityId) : null
      }));

      await prisma.notification.createMany({
        data: records
      });

      // Emit to each admin user and admin room
      admins.forEach(admin => {
        emitToUser(admin.id, 'new_notification', {
          role: 'Admin',
          type,
          title,
          message,
          organizationId: orgId,
          createdAt: new Date().toISOString()
        });
      });

      const adminRoom = `org_${orgId}_Admin`;
      emitToRoom(adminRoom, 'new_notification', {
        role: 'Admin',
        type,
        title,
        message,
        organizationId: orgId,
        createdAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }
};

module.exports = {
  sendUserNotification,
  sendAdminNotification,
  formatNotification
};
