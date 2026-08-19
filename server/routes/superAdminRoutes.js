const express = require('express');
const router = express.Router();
const {
  createOrganization,
  getAllOrganizations,
  updateOrganization,
  toggleOrganizationStatus
} = require('../controllers/superAdminController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorizeRoles('SuperAdmin'));

router.route('/organizations')
  .post(createOrganization)
  .get(getAllOrganizations);

router.route('/organizations/:id')
  .put(updateOrganization);

router.route('/organizations/:id/status')
  .put(toggleOrganizationStatus);

module.exports = router;
