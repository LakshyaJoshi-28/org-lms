const Notification = require('../models/Notification');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc    Get Notifications for Logged-In User
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res, next) => {
  try {
    let query = { organizationId: req.user.organizationId };

    if (req.user.role === 'Admin') {
      // Admins get notifications specifically for them or broadcasted to Admin role
      query.$or = [{ recipientId: req.user._id }, { role: 'Admin' }];
    } else {
      query.recipientId = req.user._id;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

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
    const notification = await Notification.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json(new ApiResponse(200, { notification }, 'Notification marked as read'));
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
    let query = { organizationId: req.user.organizationId, isRead: false };

    if (req.user.role === 'Admin') {
      query.$or = [{ recipientId: req.user._id }, { role: 'Admin' }];
    } else {
      query.recipientId = req.user._id;
    }

    await Notification.updateMany(query, { $set: { isRead: true } });

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
