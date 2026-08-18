const { prisma, withId } = require('../config/prismaClient');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

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
 * @desc    Get Notifications for Logged-In User
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res, next) => {
  try {
    const orgId = String(req.user.organizationId.id || req.user.organizationId._id || req.user.organizationId);
    const userId = String(req.user.id || req.user._id);

    const whereClause = { organizationId: orgId };

    if (req.user.role === 'Admin') {
      whereClause.OR = [{ recipientId: userId }, { role: 'Admin' }];
    } else {
      whereClause.recipientId = userId;
    }

    const [notificationsList, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.notification.count({
        where: {
          ...whereClause,
          isRead: false
        }
      })
    ]);

    const notifications = notificationsList.map(formatNotification);

    res.status(200).json(
      new ApiResponse(
        200,
        { notifications, unreadCount },
        'Notifications retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark Notification as Read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res, next) => {
  try {
    const orgId = String(req.user.organizationId.id || req.user.organizationId._id || req.user.organizationId);
    const notifId = String(req.params.id);

    const notification = await prisma.notification.findFirst({
      where: {
        id: notifId,
        organizationId: orgId
      }
    });

    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true }
    });

    res.status(200).json(new ApiResponse(200, { notification: formatNotification(updated) }, 'Notification marked as read'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark All Notifications as Read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const orgId = String(req.user.organizationId.id || req.user.organizationId._id || req.user.organizationId);
    const userId = String(req.user.id || req.user._id);

    const whereClause = { organizationId: orgId, isRead: false };

    if (req.user.role === 'Admin') {
      whereClause.OR = [{ recipientId: userId }, { role: 'Admin' }];
    } else {
      whereClause.recipientId = userId;
    }

    await prisma.notification.updateMany({
      where: whereClause,
      data: { isRead: true }
    });

    res.status(200).json(new ApiResponse(200, {}, 'All notifications marked as read'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
