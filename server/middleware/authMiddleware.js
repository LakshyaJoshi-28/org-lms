const jwt = require('jsonwebtoken');
const { prisma, withId } = require('../config/prismaClient');
const ApiError = require('../utils/apiError');

const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.jwt;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Not authorized, token missing');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
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
        profilePicture: true
      }
    });

    if (!user) {
      throw new ApiError(401, 'User no longer exists');
    }

    if (user.status === 'deactivated') {
      throw new ApiError(403, 'Account has been deactivated');
    }

    req.user = withId(user);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { protect };
