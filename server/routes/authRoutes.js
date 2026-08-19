const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const {
  setupOrganization,
  registerEmployee,
  login,
  logout,
  getMe,
  updateMyProfile,
  changePassword,
  updateProfilePicture,
  resetProfilePicture
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.post('/register-employee', registerEmployee);
router.post('/login', login);
router.post('/logout', logout);

router.use(protect);
router.post('/setup-org', authorizeRoles('SuperAdmin'), setupOrganization);
router.get('/me', getMe);
router.put('/profile', updateMyProfile);
router.put('/change-password', changePassword);
router.put('/profile-picture', upload.single('file'), updateProfilePicture);
router.delete('/profile-picture', resetProfilePicture);

module.exports = router;
