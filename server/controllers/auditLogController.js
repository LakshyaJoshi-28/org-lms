const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc    Get Organization Audit Logs
 * @route   GET /api/audit-logs
 * @access  Private (Organization Admin)
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const auditLogs = await AuditLog.find({ organizationId: req.user.organizationId })
      .populate('userId', 'name email profilePicture role')
      .sort({ timestamp: -1 })
      .limit(300);

    res.status(200).json(new ApiResponse(200, { auditLogs }, 'Audit logs retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs
};
