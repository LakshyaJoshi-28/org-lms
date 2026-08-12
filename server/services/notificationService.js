const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Send notification to a specific user (Employee or Instructor)
 */
const sendUserNotification = async (recipientId, organizationId, role, type, title, message, relatedEntity = null) => {
  try {
    return await Notification.create({
      recipientId,
      organizationId,
      role,
      type,
      title,
      message,
      relatedEntity
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

/**
 * Send aggregated notification to all Organization Admins
 */
const sendAdminNotification = async (organizationId, type, title, message, relatedEntity = null) => {
  try {
    const admins = await User.find({ organizationId, role: 'Admin' });
    const notifications = [];

    for (const admin of admins) {
      notifications.push({
        recipientId: admin._id,
        organizationId,
        role: 'Admin',
        type,
        title,
        message,
        relatedEntity
      });
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }
};

module.exports = {
  sendUserNotification,
  sendAdminNotification
};
