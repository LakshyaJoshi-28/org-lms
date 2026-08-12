const TrainingAssignment = require('../models/TrainingAssignment');
const Training = require('../models/Training');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const {
  createAutoAssignmentRule,
  deactivateAutoAssignmentRule,
  reactivateAutoAssignmentRule,
  getAutoAssignmentRules,
  assignTrainingByDeptAndRole,
  assignTrainingToMultipleEmployees
} = require('../services/trainingAssignmentService');
const { sendUserNotification, sendAdminNotification } = require('../services/notificationService');
const { logAuditAction } = require('../services/auditLogService');
const { updateOverallProgress } = require('../services/progressService');

/**
 * @desc    Manually Assign Training (Admin only)
 * @route   POST /api/assignments-engine/assign
 * @access  Private (Organization Admin)
 */
const assignTraining = async (req, res, next) => {
  try {
    const { assignmentType, trainingId, departmentId, jobRole, employeeId, employeeIds, customDeadline } = req.body;

    if (!trainingId || !assignmentType) {
      throw new ApiError(400, 'trainingId and assignmentType are required');
    }

    let result;

    if (assignmentType === 'dept_role') {
      if (!departmentId) {
        throw new ApiError(400, 'Department selection is required for targeted assignment');
      }
      result = await assignTrainingByDeptAndRole(
        req.user._id,
        req.user.organizationId,
        departmentId,
        jobRole || 'ALL_ROLES',
        trainingId,
        customDeadline
      );
    } else if (assignmentType === 'specific') {
      const ids = employeeIds || (employeeId ? [employeeId] : []);
      if (!ids || ids.length === 0) {
        throw new ApiError(400, 'At least one employee must be selected');
      }
      result = await assignTrainingToMultipleEmployees(
        req.user._id,
        req.user.organizationId,
        ids,
        trainingId,
        customDeadline
      );
    } else {
      throw new ApiError(400, 'Invalid assignmentType. Must be "dept_role" or "specific"');
    }

    await logAuditAction(req.user, 'ASSIGN_TRAINING', 'Training', trainingId, `Assigned training via ${assignmentType}`);

    res.status(201).json(new ApiResponse(201, { result }, 'Training assigned successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create Auto Assignment Rule (Admin only)
 * @route   POST /api/assignments-engine/auto-rule
 * @access  Private (Organization Admin)
 */
const createAutoRule = async (req, res, next) => {
  try {
    const { trainingId, customDeadlineDays } = req.body;

    if (!trainingId) {
      throw new ApiError(400, 'trainingId is required for auto-assignment');
    }

    const { rule, assignedCount, totalEmployees } = await createAutoAssignmentRule(
      req.user._id,
      req.user.organizationId,
      trainingId,
      customDeadlineDays || 30
    );

    await logAuditAction(
      req.user,
      'CREATE_AUTO_ASSIGNMENT_RULE',
      'Training',
      trainingId,
      `Configured compulsory auto-assignment rule for ${assignedCount} of ${totalEmployees} employees`
    );

    res.status(201).json(
      new ApiResponse(
        201,
        { rule, assignedCount, totalEmployees },
        `Auto-assignment rule configured. Assigned to ${assignedCount} existing employees.`
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Deactivate Auto Assignment Rule (Admin only)
 * @route   PUT /api/assignments-engine/auto-rules/:id/deactivate
 * @access  Private (Organization Admin)
 */
const deactivateAutoRule = async (req, res, next) => {
  try {
    const rule = await deactivateAutoAssignmentRule(
      req.user._id,
      req.user.organizationId,
      req.params.id
    );

    await logAuditAction(
      req.user,
      'DEACTIVATE_AUTO_ASSIGNMENT_RULE',
      'AutoAssignmentRule',
      rule._id,
      `Deactivated auto-assignment rule`
    );

    res.status(200).json(
      new ApiResponse(200, { rule }, 'Auto-assignment rule deactivated successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reactivate Auto Assignment Rule (Admin only)
 * @route   PUT /api/assignments-engine/auto-rules/:id/reactivate
 * @access  Private (Organization Admin)
 */
const reactivateAutoRule = async (req, res, next) => {
  try {
    const { rule, newAssignmentsCount } = await reactivateAutoAssignmentRule(
      req.user._id,
      req.user.organizationId,
      req.params.id
    );

    await logAuditAction(
      req.user,
      'REACTIVATE_AUTO_ASSIGNMENT_RULE',
      'AutoAssignmentRule',
      rule._id,
      `Reactivated auto-assignment rule`
    );

    res.status(200).json(
      new ApiResponse(200, { rule, newAssignmentsCount }, 'Auto-assignment rule reactivated successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Auto Assignment Rules (Admin only)
 * @route   GET /api/assignments-engine/auto-rules
 * @access  Private (Organization Admin)
 */
const getAutoRules = async (req, res, next) => {
  try {
    const rules = await getAutoAssignmentRules(req.user.organizationId);

    res.status(200).json(
      new ApiResponse(200, { rules }, 'Auto-assignment rules retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Current Employee's Assigned Trainings
 * @route   GET /api/assignments-engine/my-assignments
 * @access  Private (Employee)
 */
const getMyAssignments = async (req, res, next) => {
  try {
    const now = new Date();

    const rawAssignments = await TrainingAssignment.find({
      employeeId: req.user._id,
      organizationId: req.user.organizationId
    })
      .populate({
        path: 'trainingId',
        select: 'title description categoryId departmentId durationDays thumbnailUrl sections isPublished status',
        populate: [
          { path: 'categoryId', select: 'name' },
          { path: 'departmentId', select: 'name' },
          { path: 'createdBy', select: 'name email' }
        ]
      })
      .sort({ assignedDate: -1 });

    // Recalculate progress dynamically to clear any stale 99% records & process deadline checks
    for (const assignment of rawAssignments) {
      if (assignment.trainingId) {
        await updateOverallProgress(assignment._id, req.user._id);
      }

      if (assignment.status !== 'Completed' && assignment.status !== 'Locked' && new Date(assignment.deadline) < now) {
        if (assignment.status !== 'Overdue') {
          assignment.status = 'Overdue';
          assignment.overdueCount += 1;
          await assignment.save();

          if (assignment.trainingId && assignment.trainingId.createdBy) {
            await sendUserNotification(
              assignment.trainingId.createdBy._id,
              req.user.organizationId,
              'Instructor',
              'TRAINING_OVERDUE',
              'Training Overdue',
              `Employee ${req.user.name} is overdue on ${assignment.trainingId.title}`,
              { entityType: 'TrainingAssignment', entityId: assignment._id }
            );
          }

          await sendUserNotification(
            req.user._id,
            req.user.organizationId,
            'Employee',
            'TRAINING_OVERDUE',
            'Training Overdue',
            `Your training deadline for ${assignment.trainingId ? assignment.trainingId.title : 'assigned training'} has passed`,
            { entityType: 'TrainingAssignment', entityId: assignment._id }
          );
        }
      }
    }

    // Re-fetch populated assignments with fresh progress & status values
    const assignments = await TrainingAssignment.find({
      employeeId: req.user._id,
      organizationId: req.user.organizationId
    })
      .populate({
        path: 'trainingId',
        select: 'title description categoryId departmentId durationDays thumbnailUrl sections isPublished status',
        populate: [
          { path: 'categoryId', select: 'name' },
          { path: 'departmentId', select: 'name' },
          { path: 'createdBy', select: 'name email' }
        ]
      })
      .sort({ assignedDate: -1 });

    res.status(200).json(new ApiResponse(200, { assignments }, 'Employee assignments retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get All Assignments in Organization (Admin / Instructor view)
 * @route   GET /api/assignments-engine/all
 * @access  Private (Admin, Instructor)
 */
const getAllAssignments = async (req, res, next) => {
  try {
    let query = { organizationId: req.user.organizationId };

    if (req.user.role === 'Instructor') {
      const ownedTrainings = await Training.find({ createdBy: req.user._id }).select('_id');
      const trainingIds = ownedTrainings.map(t => t._id);
      query.trainingId = { $in: trainingIds };
    }

    const assignments = await TrainingAssignment.find(query)
      .populate('employeeId', 'name email departmentId jobRole profilePicture')
      .populate({
        path: 'trainingId',
        select: 'title createdBy categoryId durationDays',
        populate: { path: 'categoryId', select: 'name' }
      })
      .populate('assignedBy', 'name email')
      .sort({ assignedDate: -1 });

    res.status(200).json(new ApiResponse(200, { assignments }, 'All assignments retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Extend Training Deadline for Employee
 * @route   PUT /api/assignments-engine/:assignmentId/extend-deadline
 * @access  Private (Instructor owner, Admin)
 */
const extendDeadline = async (req, res, next) => {
  try {
    const { newDeadline, reason } = req.body;

    if (!newDeadline) {
      throw new ApiError(400, 'newDeadline date is required');
    }

    const assignment = await TrainingAssignment.findOne({
      _id: req.params.assignmentId,
      organizationId: req.user.organizationId
    }).populate('trainingId').populate('employeeId', 'name email');

    if (!assignment) {
      throw new ApiError(404, 'Assignment not found');
    }

    if (req.user.role === 'Instructor' && assignment.trainingId.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized to extend deadline for this training');
    }

    if (assignment.status === 'Completed' || assignment.progressPercentage === 100) {
      throw new ApiError(400, 'Cannot extend deadline for a completed training assignment');
    }

    const extendedToDate = new Date(newDeadline);
    assignment.extensionHistory.push({
      extendedBy: req.user._id,
      extendedTo: extendedToDate,
      extendedAt: new Date(),
      reason: reason || 'Instructor granted deadline extension'
    });

    assignment.deadline = extendedToDate;
    if (assignment.status === 'Overdue' || assignment.status === 'Locked') {
      assignment.status = assignment.progressPercentage > 0 ? 'In Progress' : 'Assigned';
    }

    await assignment.save();

    await sendUserNotification(
      assignment.employeeId._id,
      req.user.organizationId,
      'Employee',
      'DEADLINE_EXTENDED',
      'Training Deadline Extended',
      `Your deadline for ${assignment.trainingId.title} has been extended to ${extendedToDate.toDateString()}`,
      { entityType: 'TrainingAssignment', entityId: assignment._id }
    );

    await logAuditAction(req.user, 'EXTEND_DEADLINE', 'TrainingAssignment', assignment._id, `Extended deadline for ${assignment.employeeId.name} to ${extendedToDate.toDateString()}`);

    res.status(200).json(new ApiResponse(200, { assignment }, 'Training deadline extended successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lock Training for Employee
 * @route   PUT /api/assignments-engine/:assignmentId/lock
 * @access  Private (Instructor owner, Admin)
 */
const lockTraining = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const assignment = await TrainingAssignment.findOne({
      _id: req.params.assignmentId,
      organizationId: req.user.organizationId
    }).populate('trainingId').populate('employeeId', 'name email');

    if (!assignment) {
      throw new ApiError(404, 'Assignment not found');
    }

    if (req.user.role === 'Instructor' && assignment.trainingId.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized to lock this training');
    }

    if (assignment.status === 'Completed' || assignment.progressPercentage === 100) {
      throw new ApiError(400, 'Cannot lock a completed training assignment');
    }

    assignment.lockStatus = {
      isLocked: true,
      lockedAt: new Date(),
      unlockedAt: null,
      lockedReason: reason || 'Locked by instructor'
    };
    assignment.status = 'Locked';

    await assignment.save();

    await sendUserNotification(
      assignment.employeeId._id,
      req.user.organizationId,
      'Employee',
      'TRAINING_LOCKED',
      'Training Account Locked',
      `Your access to ${assignment.trainingId.title} has been locked by instructor`,
      { entityType: 'TrainingAssignment', entityId: assignment._id }
    );

    await sendAdminNotification(
      req.user.organizationId,
      'TRAINING_LOCKED',
      'Employee Training Locked',
      `Training "${assignment.trainingId.title}" was locked for ${assignment.employeeId.name}. Reason: ${reason || 'Instructor enforcement'}`,
      { entityType: 'TrainingAssignment', entityId: assignment._id }
    );

    await logAuditAction(req.user, 'LOCK_TRAINING', 'TrainingAssignment', assignment._id, `Locked training for employee ${assignment.employeeId.name}`);

    res.status(200).json(new ApiResponse(200, { assignment }, 'Training locked successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unlock Training for Employee
 * @route   PUT /api/assignments-engine/:assignmentId/unlock
 * @access  Private (Instructor owner, Admin)
 */
const unlockTraining = async (req, res, next) => {
  try {
    const assignment = await TrainingAssignment.findOne({
      _id: req.params.assignmentId,
      organizationId: req.user.organizationId
    }).populate('trainingId').populate('employeeId', 'name email');

    if (!assignment) {
      throw new ApiError(404, 'Assignment not found');
    }

    if (req.user.role === 'Instructor' && assignment.trainingId.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized to unlock this training');
    }

    if (assignment.status === 'Completed' || assignment.progressPercentage === 100) {
      throw new ApiError(400, 'Cannot unlock a completed training assignment');
    }

    const now = new Date();
    assignment.lockStatus.isLocked = false;
    assignment.lockStatus.unlockedAt = now;

    if (new Date(assignment.deadline) < now) {
      assignment.status = 'Overdue';
    } else if (assignment.progressPercentage > 0) {
      assignment.status = 'In Progress';
    } else {
      assignment.status = 'Assigned';
    }

    await assignment.save();

    await sendUserNotification(
      assignment.employeeId._id,
      req.user.organizationId,
      'Employee',
      'TRAINING_UNLOCKED',
      'Training Unlocked',
      `Your access to ${assignment.trainingId.title} has been unlocked. You may resume learning.`,
      { entityType: 'TrainingAssignment', entityId: assignment._id }
    );

    await logAuditAction(req.user, 'UNLOCK_TRAINING', 'TrainingAssignment', assignment._id, `Unlocked training for employee ${assignment.employeeId.name}`);

    res.status(200).json(new ApiResponse(200, { assignment }, 'Training unlocked successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  assignTraining,
  createAutoRule,
  deactivateAutoRule,
  reactivateAutoRule,
  getAutoRules,
  getMyAssignments,
  getAllAssignments,
  extendDeadline,
  lockTraining,
  unlockTraining
};
