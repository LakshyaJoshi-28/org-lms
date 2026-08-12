const Department = require('../models/Department');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { autoAssignMandatoryTrainings, autoAssignDeptRoleTrainings } = require('../services/trainingAssignmentService');
const { sendUserNotification, sendAdminNotification } = require('../services/notificationService');
const { logAuditAction } = require('../services/auditLogService');

/**
 * @desc    Create a new Department
 * @route   POST /api/org/departments
 * @access  Private (Organization Admin)
 */
const createDepartment = async (req, res, next) => {
  try {
    const { name, description, jobRoles } = req.body;

    if (!name) {
      throw new ApiError(400, 'Department name is required');
    }

    const existingDep = await Department.findOne({
      name: name.trim(),
      organizationId: req.user.organizationId
    });

    if (existingDep) {
      throw new ApiError(400, 'Department with this name already exists in your organization');
    }

    const department = await Department.create({
      name,
      description,
      jobRoles: jobRoles || [],
      organizationId: req.user.organizationId
    });

    await logAuditAction(req.user, 'CREATE_DEPARTMENT', 'Department', department._id, `Created department ${department.name}`);

    res.status(201).json(new ApiResponse(201, { department }, 'Department created successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all Departments for Organization
 * @route   GET /api/org/departments
 * @access  Private (Admin, Instructor, Employee)
 */
const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({
      organizationId: req.user.organizationId,
      status: 'active'
    }).sort({ name: 1 });

    res.status(200).json(new ApiResponse(200, { departments }, 'Departments retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Department
 * @route   PUT /api/org/departments/:id
 * @access  Private (Organization Admin)
 */
const updateDepartment = async (req, res, next) => {
  try {
    const { name, description, jobRoles, status } = req.body;

    const department = await Department.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!department) {
      throw new ApiError(404, 'Department not found');
    }

    if (name) department.name = name;
    if (description !== undefined) department.description = description;
    if (jobRoles) department.jobRoles = jobRoles;
    if (status) department.status = status;

    await department.save();

    await logAuditAction(req.user, 'UPDATE_DEPARTMENT', 'Department', department._id, `Updated department ${department.name}`);

    res.status(200).json(new ApiResponse(200, { department }, 'Department updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete/Deactivate Department
 * @route   DELETE /api/org/departments/:id
 * @access  Private (Organization Admin)
 */
const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!department) {
      throw new ApiError(404, 'Department not found');
    }

    department.status = 'deactivated';
    await department.save();

    await logAuditAction(req.user, 'DEACTIVATE_DEPARTMENT', 'Department', department._id, `Deactivated department ${department.name}`);

    res.status(200).json(new ApiResponse(200, {}, 'Department deactivated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create Instructor (Only Admin can create)
 * @route   POST /api/org/instructors
 * @access  Private (Organization Admin)
 */
const createInstructor = async (req, res, next) => {
  try {
    const { name, email, password, departmentId } = req.body;

    if (!name || !email || !password) {
      throw new ApiError(400, 'Please provide name, email, and password');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    if (departmentId) {
      const dep = await Department.findOne({ _id: departmentId, organizationId: req.user.organizationId });
      if (!dep) {
        throw new ApiError(404, 'Selected department does not exist in your organization');
      }
    }

    const instructor = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'Instructor',
      organizationId: req.user.organizationId,
      departmentId: departmentId || null,
      isProfileComplete: true
    });

    await logAuditAction(req.user, 'CREATE_INSTRUCTOR', 'User', instructor._id, `Created instructor ${instructor.name} (${instructor.email})`);

    const userObj = instructor.toObject();
    delete userObj.password;

    res.status(201).json(new ApiResponse(201, { instructor: userObj }, 'Instructor account created successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all Instructors
 * @route   GET /api/org/instructors
 * @access  Private (Organization Admin)
 */
const getInstructors = async (req, res, next) => {
  try {
    const instructors = await User.find({
      organizationId: req.user.organizationId,
      role: 'Instructor'
    })
      .select('-password')
      .populate('departmentId', 'name')
      .sort({ name: 1 });

    res.status(200).json(new ApiResponse(200, { instructors }, 'Instructors retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create Additional Organization Admin
 * @route   POST /api/org/admins
 * @access  Private (Organization Admin)
 */
const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new ApiError(400, 'Please provide name, email, and password');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'Admin',
      organizationId: req.user.organizationId,
      isProfileComplete: true
    });

    await logAuditAction(req.user, 'CREATE_ADMIN', 'User', admin._id, `Created admin ${admin.name} (${admin.email})`);

    const userObj = admin.toObject();
    delete userObj.password;

    res.status(201).json(new ApiResponse(201, { admin: userObj }, 'Organization Admin created successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all Employees
 * @route   GET /api/org/employees
 * @access  Private (Organization Admin)
 */
const getEmployees = async (req, res, next) => {
  try {
    const employees = await User.find({
      organizationId: req.user.organizationId,
      role: 'Employee'
    })
      .select('-password')
      .populate('departmentId', 'name jobRoles')
      .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, { employees }, 'Employees retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Employee Profile (Department & Job Role Selection)
 * @route   PUT /api/org/profile
 * @access  Private (Employee)
 */
const updateProfile = async (req, res, next) => {
  try {
    const { departmentId, jobRole } = req.body;

    const user = await User.findById(req.user._id);

    if (departmentId) {
      const dep = await Department.findOne({ _id: departmentId, organizationId: req.user.organizationId });
      if (!dep) {
        throw new ApiError(404, 'Selected department does not exist');
      }
      user.departmentId = departmentId;
    }

    if (jobRole) {
      user.jobRole = jobRole;
    }

    if (user.departmentId && user.jobRole) {
      user.isProfileComplete = true;
      // Auto-assign mandatory and dept+role trainings
      await autoAssignMandatoryTrainings(user._id, user.organizationId);
      await autoAssignDeptRoleTrainings(user._id, user.organizationId, user.departmentId, user.jobRole);
    }

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('departmentId', 'name jobRoles')
      .populate('organizationId', 'name code');

    res.status(200).json(new ApiResponse(200, { user: updatedUser }, 'Profile updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Activate / Deactivate User (Employee or Instructor)
 * @route   PUT /api/org/users/:id/status
 * @access  Private (Organization Admin)
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !['active', 'deactivated'].includes(status)) {
      throw new ApiError(400, 'Status is required and must be either "active" or "deactivated"');
    }

    const targetUser = await User.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!targetUser) {
      throw new ApiError(404, 'User not found in your organization');
    }

    if (targetUser.role === 'Admin') {
      throw new ApiError(400, 'Organization Admins cannot be deactivated or status modified through this feature');
    }

    if (targetUser.status === status) {
      return res.status(200).json(
        new ApiResponse(200, { user: targetUser }, `User is already ${status}`)
      );
    }

    targetUser.status = status;
    await targetUser.save();

    const isDeactivating = status === 'deactivated';
    const actionName = isDeactivating ? 'DEACTIVATE_USER' : 'ACTIVATE_USER';
    const actionMessage = isDeactivating ? 'deactivated' : 'reactivated';

    // Send Notification to affected user
    await sendUserNotification(
      targetUser._id,
      req.user.organizationId,
      targetUser.role,
      actionName,
      isDeactivating ? 'Account Deactivated' : 'Account Reactivated',
      isDeactivating
        ? 'Your account has been deactivated by an administrator. Access to the system is currently blocked.'
        : 'Your account has been reactivated. You may now log in and access the system normally.',
      { entityType: 'User', entityId: targetUser._id }
    );

    // Send Aggregated Notification to Organization Admins
    await sendAdminNotification(
      req.user.organizationId,
      actionName,
      `User ${isDeactivating ? 'Deactivated' : 'Reactivated'}`,
      `${targetUser.role} "${targetUser.name}" (${targetUser.email}) was ${actionMessage} by Admin ${req.user.name}`,
      { entityType: 'User', entityId: targetUser._id }
    );

    // Audit Log
    await logAuditAction(
      req.user,
      actionName,
      'User',
      targetUser._id,
      `${isDeactivating ? 'Deactivated' : 'Reactivated'} ${targetUser.role} user ${targetUser.name} (${targetUser.email})`
    );

    const userObj = targetUser.toObject();
    delete userObj.password;

    res.status(200).json(
      new ApiResponse(200, { user: userObj }, `User ${actionMessage} successfully`)
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,
  createInstructor,
  getInstructors,
  createAdmin,
  getEmployees,
  updateProfile,
  updateUserStatus
};
