const TrainingAssignment = require('../models/TrainingAssignment');
const AutoAssignmentRule = require('../models/AutoAssignmentRule');
const Training = require('../models/Training');
const User = require('../models/User');

/**
 * Automatically assign mandatory trainings to a newly registered/configured employee
 */
const autoAssignMandatoryTrainings = async (employeeId, organizationId) => {
  try {
    const mandatoryTrainings = await Training.find({
      organizationId,
      isMandatory: true,
      isPublished: true,
      status: 'published'
    });

    const now = new Date();
    const assignmentsCreated = [];

    for (const training of mandatoryTrainings) {
      const deadline = new Date(now.getTime() + (training.durationDays || 30) * 24 * 60 * 60 * 1000);

      try {
        const assignment = await TrainingAssignment.create({
          employeeId,
          trainingId: training._id,
          assignedBy: null,
          organizationId,
          assignmentType: 'mandatory',
          assignedDate: now,
          deadline,
          status: 'Assigned'
        });
        assignmentsCreated.push(assignment);
      } catch (err) {
        if (err.code !== 11000) throw err;
      }
    }

    return assignmentsCreated;
  } catch (error) {
    console.error('Error auto-assigning mandatory trainings:', error);
    return [];
  }
};

/**
 * Automatically assign Department + Role matched trainings to an employee upon profile completion
 */
const autoAssignDeptRoleTrainings = async (employeeId, organizationId, departmentId, jobRole) => {
  try {
    if (!departmentId) return [];

    const matchedTrainings = await Training.find({
      organizationId,
      departmentId,
      isPublished: true,
      status: 'published'
    });

    const now = new Date();
    const assignmentsCreated = [];

    for (const training of matchedTrainings) {
      const deadline = new Date(now.getTime() + (training.durationDays || 30) * 24 * 60 * 60 * 1000);

      try {
        const assignment = await TrainingAssignment.create({
          employeeId,
          trainingId: training._id,
          assignedBy: null,
          organizationId,
          assignmentType: 'dept_role',
          assignedDate: now,
          deadline,
          status: 'Assigned'
        });
        assignmentsCreated.push(assignment);
      } catch (err) {
        if (err.code !== 11000) throw err;
      }
    }

    return assignmentsCreated;
  } catch (error) {
    console.error('Error auto-assigning dept/role trainings:', error);
    return [];
  }
};

/**
 * Automatically assign active Organization Auto-Assignment Rules to a new/updating employee
 */
const autoAssignRulesToNewEmployee = async (employeeId, organizationId) => {
  try {
    const activeRules = await AutoAssignmentRule.find({
      organizationId,
      status: 'active'
    });

    const now = new Date();
    const assignmentsCreated = [];

    for (const rule of activeRules) {
      const deadlineDays = rule.customDeadlineDays || 30;
      const deadline = new Date(now.getTime() + deadlineDays * 24 * 60 * 60 * 1000);

      try {
        const assignment = await TrainingAssignment.create({
          employeeId,
          trainingId: rule.trainingId,
          assignedBy: rule.createdBy,
          organizationId,
          assignmentType: 'auto',
          assignedDate: now,
          deadline,
          status: 'Assigned'
        });
        assignmentsCreated.push(assignment);
      } catch (err) {
        if (err.code !== 11000) throw err;
      }
    }

    return assignmentsCreated;
  } catch (error) {
    console.error('Error applying auto-assignment rules to employee:', error);
    return [];
  }
};

/**
 * Admin creates an Auto Assignment Rule (compulsory for ALL existing & future employees)
 */
const createAutoAssignmentRule = async (adminId, organizationId, trainingId, customDeadlineDays = 30) => {
  const training = await Training.findOne({
    _id: trainingId,
    organizationId,
    isPublished: true,
    status: 'published'
  });

  if (!training) {
    throw new Error('Published training course not found in your organization');
  }

  // Check if active rule already exists for this training
  let rule = await AutoAssignmentRule.findOne({ organizationId, trainingId });
  if (rule && rule.status === 'active') {
    throw new Error('An active auto-assignment rule already exists for this training');
  }

  if (rule) {
    rule.status = 'active';
    rule.createdBy = adminId;
    rule.customDeadlineDays = Number(customDeadlineDays) || 30;
    await rule.save();
  } else {
    rule = await AutoAssignmentRule.create({
      organizationId,
      trainingId,
      createdBy: adminId,
      status: 'active',
      customDeadlineDays: Number(customDeadlineDays) || 30
    });
  }

  // Immediately assign training to ALL existing active employees in the organization
  const employees = await User.find({ organizationId, role: 'Employee' });
  const now = new Date();
  const deadlineDays = Number(customDeadlineDays) || 30;
  const deadline = new Date(now.getTime() + deadlineDays * 24 * 60 * 60 * 1000);

  let assignedCount = 0;
  for (const emp of employees) {
    try {
      await TrainingAssignment.create({
        employeeId: emp._id,
        trainingId: training._id,
        assignedBy: adminId,
        organizationId,
        assignmentType: 'auto',
        assignedDate: now,
        deadline,
        status: 'Assigned'
      });
      assignedCount++;
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }

  return { rule, assignedCount, totalEmployees: employees.length };
};

/**
 * Deactivate an Auto Assignment Rule (does not delete existing employee assignments)
 */
const deactivateAutoAssignmentRule = async (adminId, organizationId, ruleId) => {
  const rule = await AutoAssignmentRule.findOne({ _id: ruleId, organizationId });
  if (!rule) {
    throw new Error('Auto assignment rule not found');
  }

  rule.status = 'inactive';
  await rule.save();

  return rule;
};

/**
 * Reactivate an Auto Assignment Rule (does not create duplicate assignments for existing employees)
 */
const reactivateAutoAssignmentRule = async (adminId, organizationId, ruleId) => {
  const rule = await AutoAssignmentRule.findOne({ _id: ruleId, organizationId });
  if (!rule) {
    throw new Error('Auto assignment rule not found');
  }

  rule.status = 'active';
  rule.createdBy = adminId;
  await rule.save();

  // Safely assign ONLY to existing eligible employees who currently have NO assignment for this training
  const employees = await User.find({ organizationId, role: 'Employee' });
  const now = new Date();
  const deadlineDays = Number(rule.customDeadlineDays) || 30;
  const deadline = new Date(now.getTime() + deadlineDays * 24 * 60 * 60 * 1000);

  let newAssignmentsCount = 0;
  for (const emp of employees) {
    try {
      await TrainingAssignment.create({
        employeeId: emp._id,
        trainingId: rule.trainingId,
        assignedBy: adminId,
        organizationId,
        assignmentType: 'auto',
        assignedDate: now,
        deadline,
        status: 'Assigned'
      });
      newAssignmentsCount++;
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }

  return { rule, newAssignmentsCount };
};

/**
 * Get all Auto Assignment Rules for organization
 */
const getAutoAssignmentRules = async (organizationId) => {
  const rules = await AutoAssignmentRule.find({ organizationId })
    .populate({
      path: 'trainingId',
      select: 'title categoryId durationDays thumbnailUrl status',
      populate: { path: 'categoryId', select: 'name' }
    })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  const rulesWithStats = await Promise.all(
    rules.map(async (r) => {
      const coverageCount = await TrainingAssignment.countDocuments({
        organizationId,
        trainingId: r.trainingId?._id
      });
      return {
        ...r.toObject(),
        coverageCount
      };
    })
  );

  return rulesWithStats;
};

/**
 * Admin assigns training to all employees matching Department + Job Role
 */
const assignTrainingByDeptAndRole = async (adminId, organizationId, departmentId, jobRole, trainingId, customDeadlineDate = null) => {
  const training = await Training.findOne({
    _id: trainingId,
    organizationId,
    isPublished: true,
    status: 'published'
  });

  if (!training) {
    throw new Error('Published training course not found in your organization');
  }

  const query = { organizationId, role: 'Employee', departmentId };
  if (jobRole && jobRole !== 'ALL_ROLES') {
    query.jobRole = jobRole;
  }

  const employees = await User.find(query);

  if (employees.length === 0) {
    throw new Error('No active employees match the selected department and job role criteria');
  }

  const now = new Date();
  let deadline;
  if (customDeadlineDate) {
    deadline = new Date(customDeadlineDate);
  } else {
    deadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  const results = [];
  let newAssignmentsCount = 0;

  for (const emp of employees) {
    try {
      const assignment = await TrainingAssignment.create({
        employeeId: emp._id,
        trainingId: training._id,
        assignedBy: adminId,
        organizationId,
        assignmentType: 'dept_role',
        assignedDate: now,
        deadline,
        status: 'Assigned'
      });
      results.push(assignment);
      newAssignmentsCount++;
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }

  return { results, newAssignmentsCount, matchedEmployeesCount: employees.length };
};

/**
 * Admin assigns training to multiple specific employees
 */
const assignTrainingToMultipleEmployees = async (adminId, organizationId, employeeIds, trainingId, customDeadlineDate = null) => {
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    throw new Error('At least one employee must be selected');
  }

  const training = await Training.findOne({
    _id: trainingId,
    organizationId,
    isPublished: true,
    status: 'published'
  });

  if (!training) {
    throw new Error('Published training course not found in your organization');
  }

  const employees = await User.find({
    _id: { $in: employeeIds },
    organizationId,
    role: 'Employee'
  });

  if (employees.length === 0) {
    throw new Error('No valid employees found from selected list');
  }

  const now = new Date();
  let deadline;
  if (customDeadlineDate) {
    deadline = new Date(customDeadlineDate);
  } else {
    deadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  const results = [];
  let newAssignmentsCount = 0;

  for (const emp of employees) {
    try {
      const assignment = await TrainingAssignment.create({
        employeeId: emp._id,
        trainingId: training._id,
        assignedBy: adminId,
        organizationId,
        assignmentType: 'specific',
        assignedDate: now,
        deadline,
        status: 'Assigned'
      });
      results.push(assignment);
      newAssignmentsCount++;
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }

  return { results, newAssignmentsCount, selectedEmployeesCount: employees.length };
};

module.exports = {
  autoAssignMandatoryTrainings,
  autoAssignDeptRoleTrainings,
  autoAssignRulesToNewEmployee,
  createAutoAssignmentRule,
  deactivateAutoAssignmentRule,
  reactivateAutoAssignmentRule,
  getAutoAssignmentRules,
  assignTrainingByDeptAndRole,
  assignTrainingToMultipleEmployees
};
