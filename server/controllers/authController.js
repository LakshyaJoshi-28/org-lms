const bcrypt = require('bcryptjs');
const { prisma, withId } = require('../config/prismaClient');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const generateTokenAndSetCookie = require('../utils/generateToken');
const {
  autoAssignMandatoryTrainings,
  autoAssignDeptRoleTrainings,
  autoAssignRulesToNewEmployee
} = require('../services/trainingAssignmentService');
const { logAuditAction } = require('../services/auditLogService');
const { getCloudinary } = require('../config/cloudinary');

const getDefaultDiceBearAvatar = (name) => {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}`;
};

const formatUserResponse = (user) => {
  if (!user) return null;
  const userObj = withId(user);
  delete userObj.password;
  if (userObj.organization) {
    userObj.organizationId = withId(userObj.organization);
  }
  if (userObj.department) {
    userObj.departmentId = withId(userObj.department);
  }
  return userObj;
};

/**
 * @desc    Initial Setup for Organization + Admin
 * @route   POST /api/auth/setup-org
 * @access  Public
 */
const setupOrganization = async (req, res, next) => {
  try {
    const { orgName, orgCode, adminName, adminEmail, adminPassword } = req.body;

    if (!orgName || !adminName || !adminEmail || !adminPassword) {
      throw new ApiError(400, 'Please provide all required fields (orgName, adminName, adminEmail, adminPassword)');
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: adminEmail.toLowerCase() }
    });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    // Auto generate code if not provided
    let finalCode = orgCode ? orgCode.toUpperCase().trim() : null;
    if (!finalCode && orgName) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const cleanName = orgName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
      finalCode = `${cleanName}-${randomSuffix}`;
    }

    const existingOrg = await prisma.organization.findUnique({
      where: { code: finalCode }
    });
    if (existingOrg) {
      throw new ApiError(400, 'Organization code already exists. Please choose a different organization code.');
    }

    const organization = await prisma.organization.create({
      data: {
        name: orgName.trim(),
        code: finalCode
      }
    });

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const profilePicture = getDefaultDiceBearAvatar(adminName);

    const admin = await prisma.user.create({
      data: {
        name: adminName.trim(),
        email: adminEmail.toLowerCase().trim(),
        password: hashedPassword,
        role: 'Admin',
        organizationId: organization.id,
        isProfileComplete: true,
        profilePicture
      }
    });

    generateTokenAndSetCookie(res, admin.id, admin.role, admin.organizationId, admin.name);

    const userObj = formatUserResponse(admin);

    res.status(201).json(
      new ApiResponse(
        201,
        { user: userObj, organization: withId(organization) },
        'Organization and Organization Admin setup completed successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Public Employee Registration
 * @route   POST /api/auth/register-employee
 * @access  Public
 */
const registerEmployee = async (req, res, next) => {
  try {
    const { name, email, password, orgCode } = req.body;

    if (!name || !email || !password || !orgCode) {
      throw new ApiError(400, 'Please provide name, email, password, and organization code');
    }

    const organization = await prisma.organization.findUnique({
      where: { code: orgCode.toUpperCase().trim() }
    });
    if (!organization) {
      throw new ApiError(404, 'Organization not found with the provided code');
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() }
    });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const profilePicture = getDefaultDiceBearAvatar(name);

    const employee = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'Employee',
        organizationId: organization.id,
        isProfileComplete: false,
        profilePicture
      }
    });

    // Auto-assign mandatory trainings & active auto-assignment rules
    await autoAssignMandatoryTrainings(employee.id, organization.id);
    await autoAssignRulesToNewEmployee(employee.id, organization.id);

    // Notify Org Admins
    const { sendAdminNotification } = require('../services/notificationService');
    await sendAdminNotification(
      organization.id,
      'NEW_EMPLOYEE_REGISTERED',
      'New Employee Registered',
      `A new employee, ${employee.name}, has registered in your organization.`,
      { entityType: 'User', entityId: employee.id }
    );

    generateTokenAndSetCookie(res, employee.id, employee.role, employee.organizationId, employee.name);

    const userObj = formatUserResponse(employee);

    res.status(201).json(
      new ApiResponse(
        201,
        { user: userObj, organization: withId(organization) },
        'Employee registered successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login User (Admin, Instructor, Employee)
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, 'Please provide email and password');
    }

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() },
      include: {
        organization: {
          select: { id: true, name: true, code: true, status: true }
        }
      }
    });

    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (user.status === 'deactivated') {
      throw new ApiError(403, 'Your account has been deactivated. Please contact your administrator.');
    }

    if (user.role !== 'SuperAdmin' && user.organization && String(user.organization.status || 'ACTIVE').toUpperCase() === 'INACTIVE') {
      throw new ApiError(403, 'Your organization has been deactivated by the Super Admin. Please contact your administrator.');
    }

    generateTokenAndSetCookie(res, user.id, user.role, user.organizationId, user.name);

    const userObj = formatUserResponse(user);

    res.status(200).json(
      new ApiResponse(
        200,
        { user: userObj },
        'Logged in successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout User / Clear Cookie
 * @route   POST /api/auth/logout
 * @access  Public / Private
 */
const logout = async (req, res, next) => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('jwt', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      expires: new Date(0)
    });

    res.status(200).json(new ApiResponse(200, {}, 'Logged out successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Current User Profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const userId = String(req.user.id || req.user._id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        organizationId: true,
        departmentId: true,
        jobRole: true,
        isProfileComplete: true,
        profilePicture: true,
        organization: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, jobRoles: true } }
      }
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const userObj = formatUserResponse(user);
    res.status(200).json(new ApiResponse(200, { user: userObj }, 'Current user profile retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Logged-in User Profile (Admin, Instructor, Employee)
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const { name, departmentId, jobRole } = req.body;
    const userId = String(req.user.id || req.user._id);

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const updateData = {};

    if (name) {
      if (!name.trim()) {
        throw new ApiError(400, 'Name cannot be empty');
      }
      updateData.name = name.trim();
      if (!user.isCustomAvatar) {
        updateData.profilePicture = getDefaultDiceBearAvatar(updateData.name);
      }
    }

    if (departmentId) {
      const depId = String(departmentId);
      const dep = await prisma.department.findFirst({
        where: { id: depId, organizationId: user.organizationId }
      });
      if (!dep) {
        throw new ApiError(404, 'Selected department does not exist in your organization');
      }
      updateData.departmentId = depId;
    }

    if (jobRole) {
      updateData.jobRole = jobRole.trim();
    }

    const effectiveDepId = updateData.departmentId || user.departmentId;
    const effectiveJobRole = updateData.jobRole || user.jobRole;

    if (user.role === 'Employee' && effectiveDepId && effectiveJobRole) {
      updateData.isProfileComplete = true;
    }

    const updatedUserRecord = await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    if (user.role === 'Employee' && updatedUserRecord.isProfileComplete) {
      await autoAssignMandatoryTrainings(updatedUserRecord.id, updatedUserRecord.organizationId);
      await autoAssignDeptRoleTrainings(updatedUserRecord.id, updatedUserRecord.organizationId, updatedUserRecord.departmentId, updatedUserRecord.jobRole);
      await autoAssignRulesToNewEmployee(updatedUserRecord.id, updatedUserRecord.organizationId);
    }

    await logAuditAction(req.user, 'UPDATE_PROFILE', 'User', updatedUserRecord.id, `Profile updated for ${updatedUserRecord.role} ${updatedUserRecord.name}`);

    const finalUser = await prisma.user.findUnique({
      where: { id: updatedUserRecord.id },
      include: {
        organization: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, jobRoles: true } }
      }
    });

    res.status(200).json(new ApiResponse(200, { user: formatUserResponse(finalUser) }, 'Profile updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change Password (Admin, Instructor, Employee)
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ApiError(400, 'Please provide both currentPassword and newPassword');
    }

    if (newPassword.length < 6) {
      throw new ApiError(400, 'New password must be at least 6 characters long');
    }

    const userId = String(req.user.id || req.user._id);
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new ApiError(400, 'Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    await logAuditAction(req.user, 'CHANGE_PASSWORD', 'User', user.id, `Password changed for user ${user.name}`);

    res.status(200).json(new ApiResponse(200, {}, 'Password changed successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload / Update Profile Picture (Admin, Instructor, Employee)
 * @route   PUT /api/auth/profile-picture
 * @access  Private
 */
const updateProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Please select an image file to upload as profile picture');
    }

    const userId = String(req.user.id || req.user._id);
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const cloudinaryInstance = getCloudinary();

    if (user.profilePicturePublicId) {
      try {
        await cloudinaryInstance.uploader.destroy(user.profilePicturePublicId);
      } catch (err) {
        console.error('Failed to destroy previous profile picture from Cloudinary:', err);
      }
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinaryInstance.uploader.upload_stream(
        {
          folder: 'org_lms/profile_pictures',
          resource_type: 'image'
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    const updatedUserRecord = await prisma.user.update({
      where: { id: user.id },
      data: {
        profilePicture: uploadResult.secure_url,
        profilePicturePublicId: uploadResult.public_id,
        isCustomAvatar: true
      }
    });

    await logAuditAction(req.user, 'UPDATE_PROFILE_PICTURE', 'User', user.id, `Updated profile picture for ${user.role} ${user.name}`);

    const finalUser = await prisma.user.findUnique({
      where: { id: updatedUserRecord.id },
      include: {
        organization: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, jobRoles: true } }
      }
    });

    res.status(200).json(new ApiResponse(200, { user: formatUserResponse(finalUser) }, 'Profile picture updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset Profile Picture to Default DiceBear Avatar
 * @route   DELETE /api/auth/profile-picture
 * @access  Private
 */
const resetProfilePicture = async (req, res, next) => {
  try {
    const userId = String(req.user.id || req.user._id);
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.profilePicturePublicId) {
      const cloudinaryInstance = getCloudinary();
      try {
        await cloudinaryInstance.uploader.destroy(user.profilePicturePublicId);
      } catch (err) {
        console.error('Failed to destroy Cloudinary image:', err);
      }
    }

    const updatedUserRecord = await prisma.user.update({
      where: { id: user.id },
      data: {
        profilePicturePublicId: null,
        isCustomAvatar: false,
        profilePicture: getDefaultDiceBearAvatar(user.name)
      }
    });

    await logAuditAction(req.user, 'RESET_PROFILE_PICTURE', 'User', user.id, `Reset profile picture to default for ${user.name}`);

    const finalUser = await prisma.user.findUnique({
      where: { id: updatedUserRecord.id },
      include: {
        organization: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, jobRoles: true } }
      }
    });

    res.status(200).json(new ApiResponse(200, { user: formatUserResponse(finalUser) }, 'Profile picture reset to default avatar successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  setupOrganization,
  registerEmployee,
  login,
  logout,
  getMe,
  updateMyProfile,
  changePassword,
  updateProfilePicture,
  resetProfilePicture
};
