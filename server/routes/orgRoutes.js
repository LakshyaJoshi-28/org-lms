const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/orgController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(protect);

// Department Routes
router.route('/departments')
  .get(getDepartments)
  .post(authorizeRoles('Admin'), createDepartment);

router.route('/departments/:id')
  .put(authorizeRoles('Admin'), updateDepartment)
  .delete(authorizeRoles('Admin'), deleteDepartment);

// User Management Routes
router.route('/instructors')
  .get(authorizeRoles('Admin'), getInstructors)
  .post(authorizeRoles('Admin'), createInstructor);

router.post('/admins', authorizeRoles('Admin'), createAdmin);
router.get('/employees', authorizeRoles('Admin'), getEmployees);
router.put('/profile', updateProfile);

// User Activation / Deactivation Route
router.put('/users/:id/status', authorizeRoles('Admin'), updateUserStatus);

module.exports = router;
