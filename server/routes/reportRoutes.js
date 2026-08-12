const express = require('express');
const router = express.Router();
const {
  getFullOrgReport,
  getAdminDashboardReports,
  getEmployeeReport,
  getInstructorDashboardReports,
  getMyReport
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/full-org-report', authorizeRoles('Admin'), getFullOrgReport);
router.get('/admin-dashboard', authorizeRoles('Admin'), getAdminDashboardReports);
router.get('/instructor-dashboard', authorizeRoles('Instructor'), getInstructorDashboardReports);
router.get('/employee/:employeeId', authorizeRoles('Admin', 'Instructor'), getEmployeeReport);
router.get('/my-report', authorizeRoles('Employee'), getMyReport);

module.exports = router;
