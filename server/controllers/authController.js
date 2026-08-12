const User = require('../models/User');
const Organization = require('../models/Organization');
const Department = require('../models/Department');
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

    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    const organization = await Organization.create({
      name: orgName,
      code: orgCode
    });

    const admin = await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      role: 'Admin',
      organizationId: organization._id,
      isProfileComplete: true
    });

    generateTokenAndSetCookie(res, admin._id, admin.role, admin.organizationId);

    const userObj = admin.toObject();
    delete userObj.password;

    res.status(201).json(
      new ApiResponse(
        201,
        { user: userObj, organization },
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

    const organization = await Organization.findOne({ code: orgCode.toUpperCase() });
    if (!organization) {
      throw new ApiError(404, 'Organization not found with the provided code');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    const employee = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'Employee',
      organizationId: organization._id,
      isProfileComplete: false
    });

    // Auto-assign mandatory trainings & active auto-assignment rules
    await autoAssignMandatoryTrainings(employee._id, organization._id);
    await autoAssignRulesToNewEmployee(employee._id, organization._id);

    generateTokenAndSetCookie(res, employee._id, employee.role, employee.organizationId);

    const userObj = employee.toObject();
    delete userObj.password;

    res.status(201).json(
      new ApiResponse(
        201,
        { user: userObj, organization },
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

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password').populate('organizationId', 'name code');

    if (!user || !(await user.matchPassword(password))) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (user.status === 'deactivated') {
      throw new ApiError(403, 'Your account has been deactivated. Please contact your administrator.');
    }

    generateTokenAndSetCookie(res, user._id, user.role, user.organizationId);

    const userObj = user.toObject();
    delete userObj.password;

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
    res.cookie('jwt', '', {
      httpOnly: true,
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
    const user = await User.findById(req.user._id)
      .populate('organizationId', 'name code')
      .populate('departmentId', 'name jobRoles');

    res.status(200).json(new ApiResponse(200, { user }, 'Current user profile retrieved'));
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

    const user = await User.findById(req.user._id);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (name) {
      if (!name.trim()) {
        throw new ApiError(400, 'Name cannot be empty');
      }
      user.name = name.trim();
      if (!user.isCustomAvatar) {
        user.profilePicture = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`;
      }
    }

    if (departmentId) {
      const dep = await Department.findOne({ _id: departmentId, organizationId: user.organizationId });
      if (!dep) {
        throw new ApiError(404, 'Selected department does not exist in your organization');
      }
      user.departmentId = departmentId;
    }

    if (jobRole) {
      user.jobRole = jobRole.trim();
    }

    if (user.role === 'Employee' && user.departmentId && user.jobRole) {
      user.isProfileComplete = true;
      await autoAssignMandatoryTrainings(user._id, user.organizationId);
      await autoAssignDeptRoleTrainings(user._id, user.organizationId, user.departmentId, user.jobRole);
      await autoAssignRulesToNewEmployee(user._id, user.organizationId);
    }

    await user.save();

    await logAuditAction(req.user, 'UPDATE_PROFILE', 'User', user._id, `Profile updated for ${user.role} ${user.name}`);

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('organizationId', 'name code')
      .populate('departmentId', 'name jobRoles');

    res.status(200).json(new ApiResponse(200, { user: updatedUser }, 'Profile updated successfully'));
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

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      throw new ApiError(400, 'Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    await logAuditAction(req.user, 'CHANGE_PASSWORD', 'User', user._id, `Password changed for user ${user.name}`);

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

    const user = await User.findById(req.user._id);
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

    user.profilePicture = uploadResult.secure_url;
    user.profilePicturePublicId = uploadResult.public_id;
    user.isCustomAvatar = true;

    await user.save();

    await logAuditAction(req.user, 'UPDATE_PROFILE_PICTURE', 'User', user._id, `Updated profile picture for ${user.role} ${user.name}`);

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('organizationId', 'name code')
      .populate('departmentId', 'name jobRoles');

    res.status(200).json(new ApiResponse(200, { user: updatedUser }, 'Profile picture updated successfully'));
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
    const user = await User.findById(req.user._id);
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

    user.profilePicturePublicId = null;
    user.isCustomAvatar = false;
    user.profilePicture = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`;

    await user.save();

    await logAuditAction(req.user, 'RESET_PROFILE_PICTURE', 'User', user._id, `Reset profile picture to default for ${user.name}`);

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('organizationId', 'name code')
      .populate('departmentId', 'name jobRoles');

    res.status(200).json(new ApiResponse(200, { user: updatedUser }, 'Profile picture reset to default avatar successfully'));
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
