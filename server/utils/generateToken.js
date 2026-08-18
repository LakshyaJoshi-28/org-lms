const jwt = require('jsonwebtoken');

const generateTokenAndSetCookie = (res, userId, role, organizationId) => {
  const token = jwt.sign(
    { id: userId, role, organizationId },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  };

  res.cookie('jwt', token, cookieOptions);

  return token;
};

module.exports = generateTokenAndSetCookie;
