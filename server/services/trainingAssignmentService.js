const { prisma, withId } = require('../config/prismaClient');
const ApiError = require('../utils/apiError');

/**
 * Automatically assign mandatory trainings to a newly registered/configured employee
 */
const autoAssignMandatoryTrainings = async (employeeId, organizationId) => {
  try {
    const empId = String(employeeId);
    const orgId = String(organizationId);

    const mandatoryTrainings = await prisma.training.findMany({
      where: {
        organizationId: orgId,
        isMandatory: true,
        isPublished: true,
        status: 'published'
      }
    });

    const now = new Date();
    const assignmentsCreated = [];

    for (const training of mandatoryTrainings) {
      const deadline = new Date(now.getTime() + (training.durationDays || 30) * 24 * 60 * 60 * 1000);

      try {
        const assignment = await prisma.trainingAssignment.create({
          data: {
            employeeId: empId,
            trainingId: training.id,
            assignedBy: null,
            organizationId: orgId,
            assignmentType: 'mandatory',
            assignedDate: now,
            deadline,
            status: 'Assigned'
          }
        });
        assignmentsCreated.push(withId(assignment));
      } catch (err) {
        if (err.code !== 'P2002' && err.code !== 11000) throw err;
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

    const empId = String(employeeId);
    const orgId = String(organizationId);
    const depId = String(departmentId);

    const matchedTrainings = await prisma.training.findMany({
      where: {
        organizationId: orgId,
        departmentId: depId,
        isPublished: true,
        status: 'published'
      }
    });

    const now = new Date();
    const assignmentsCreated = [];

    for (const training of matchedTrainings) {
      const deadline = new Date(now.getTime() + (training.durationDays || 30) * 24 * 60 * 60 * 1000);

      try {
        const assignment = await prisma.trainingAssignment.create({
          data: {
            employeeId: empId,
            trainingId: training.id,
            assignedBy: null,
            organizationId: orgId,
            assignmentType: 'dept_role',
            assignedDate: now,
            deadline,
            status: 'Assigned'
          }
        });
        assignmentsCreated.push(withId(assignment));
      } catch (err) {
        if (err.code !== 'P2002' && err.code !== 11000) throw err;
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
    const empId = String(employeeId);
    const orgId = String(organizationId);

    const activeRules = await prisma.autoAssignmentRule.findMany({
      where: {
        organizationId: orgId,
        status: 'active'
      }
    });

    const now = new Date();
    const assignmentsCreated = [];

    for (const rule of activeRules) {
      const deadlineDays = rule.customDeadlineDays || 30;
      const deadline = new Date(now.getTime() + deadlineDays * 24 * 60 * 60 * 1000);

      try {
        const assignment = await prisma.trainingAssignment.create({
          data: {
            employeeId: empId,
            trainingId: rule.trainingId,
            assignedBy: rule.createdBy,
            organizationId: orgId,
            assignmentType: 'auto',
            assignedDate: now,
            deadline,
            status: 'Assigned'
          }
        });
        assignmentsCreated.push(withId(assignment));
      } catch (err) {
        if (err.code !== 'P2002' && err.code !== 11000) throw err;
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
  const admId = String(adminId);
  const orgId = String(organizationId);
  const trgId = String(trainingId);

  const training = await prisma.training.findFirst({
    where: {
      id: trgId,
      organizationId: orgId,
      isPublished: true,
      status: 'published'
    }
  });

  if (!training) {
    throw new Error('Published training course not found in your organization');
  }

  // Check if rule exists
  let rule = await prisma.autoAssignmentRule.findFirst({
    where: { organizationId: orgId, trainingId: trgId }
  });

  if (rule && rule.status === 'active') {
    throw new Error('An active auto-assignment rule already exists for this training');
  }

  if (rule) {
    rule = await prisma.autoAssignmentRule.update({
      where: { id: rule.id },
      data: {
        status: 'active',
        createdBy: admId,
        customDeadlineDays: Number(customDeadlineDays) || 30
      }
    });
  } else {
    rule = await prisma.autoAssignmentRule.create({
      data: {
        organizationId: orgId,
        trainingId: trgId,
        createdBy: admId,
        status: 'active',
        customDeadlineDays: Number(customDeadlineDays) || 30
      }
    });
  }

  // Immediately assign training to ALL existing active employees in the organization
  const employees = await prisma.user.findMany({
    where: { organizationId: orgId, role: 'Employee' }
  });
  const now = new Date();
  const deadlineDays = Number(customDeadlineDays) || 30;
  const deadline = new Date(now.getTime() + deadlineDays * 24 * 60 * 60 * 1000);

  let assignedCount = 0;
  for (const emp of employees) {
    try {
      await prisma.trainingAssignment.create({
        data: {
          employeeId: emp.id,
          trainingId: training.id,
          assignedBy: admId,
          organizationId: orgId,
          assignmentType: 'auto',
          assignedDate: now,
          deadline,
          status: 'Assigned'
        }
      });
      assignedCount++;
    } catch (err) {
      if (err.code !== 'P2002' && err.code !== 11000) throw err;
    }
  }

  return { rule: withId(rule), assignedCount, totalEmployees: employees.length };
};

/**
 * Deactivate an Auto Assignment Rule
 */
const deactivateAutoAssignmentRule = async (adminId, organizationId, ruleId) => {
  const orgId = String(organizationId);
  const rId = String(ruleId);

  const rule = await prisma.autoAssignmentRule.findFirst({
    where: { id: rId, organizationId: orgId }
  });
  if (!rule) {
    throw new ApiError(404, 'Auto assignment rule not found');
  }

  const updatedRule = await prisma.autoAssignmentRule.update({
    where: { id: rule.id },
    data: { status: 'inactive' }
  });

  return withId(updatedRule);
};

/**
 * Reactivate an Auto Assignment Rule
 */
const reactivateAutoAssignmentRule = async (adminId, organizationId, ruleId) => {
  const admId = String(adminId);
  const orgId = String(organizationId);
  const rId = String(ruleId);

  const rule = await prisma.autoAssignmentRule.findFirst({
    where: { id: rId, organizationId: orgId }
  });
  if (!rule) {
    throw new ApiError(404, 'Auto assignment rule not found');
  }

  const updatedRule = await prisma.autoAssignmentRule.update({
    where: { id: rule.id },
    data: {
      status: 'active'
    }
  });

  const employees = await prisma.user.findMany({
    where: { organizationId: orgId, role: 'Employee' }
  });
  const now = new Date();
  const deadlineDays = Number(rule.customDeadlineDays) || 30;
  const deadline = new Date(now.getTime() + deadlineDays * 24 * 60 * 60 * 1000);

  let newAssignmentsCount = 0;
  for (const emp of employees) {
    try {
      await prisma.trainingAssignment.create({
        data: {
          employeeId: emp.id,
          trainingId: rule.trainingId,
          assignedBy: admId,
          organizationId: orgId,
          assignmentType: 'auto',
          assignedDate: now,
          deadline,
          status: 'Assigned'
        }
      });
      newAssignmentsCount++;
    } catch (err) {
      if (err.code !== 'P2002' && err.code !== 11000) throw err;
    }
  }

  return { rule: withId(updatedRule), newAssignmentsCount };
};

/**
 * Get all Auto Assignment Rules for organization
 */
const getAutoAssignmentRules = async (organizationId) => {
  const orgId = String(organizationId);

  const rules = await prisma.autoAssignmentRule.findMany({
    where: { organizationId: orgId },
    include: {
      training: {
        select: {
          id: true,
          title: true,
          categoryId: true,
          durationDays: true,
          thumbnailUrl: true,
          status: true,
          category: {
            select: { id: true, name: true }
          }
        }
      },
      creator: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const rulesWithStats = await Promise.all(
    rules.map(async (r) => {
      const coverageCount = await prisma.trainingAssignment.count({
        where: {
          organizationId: orgId,
          trainingId: r.trainingId
        }
      });

      // Structure object for backward compatibility with Mongoose model shapes
      const transformed = withId(r);
      if (transformed.training) {
        transformed.trainingId = transformed.training;
        if (transformed.training.category) {
          transformed.trainingId.categoryId = transformed.training.category;
        }
      }
      if (transformed.creator) {
        transformed.createdBy = transformed.creator;
      }

      return {
        ...transformed,
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
  const admId = String(adminId);
  const orgId = String(organizationId);
  const depId = String(departmentId);
  const trgId = String(trainingId);

  const training = await prisma.training.findFirst({
    where: {
      id: trgId,
      organizationId: orgId,
      isPublished: true,
      status: 'published'
    }
  });

  if (!training) {
    throw new Error('Published training course not found in your organization');
  }

  const whereClause = { organizationId: orgId, role: 'Employee', departmentId: depId };
  if (jobRole && jobRole !== 'ALL_ROLES') {
    whereClause.jobRole = jobRole;
  }

  const employees = await prisma.user.findMany({ where: whereClause });

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
      const assignment = await prisma.trainingAssignment.create({
        data: {
          employeeId: emp.id,
          trainingId: training.id,
          assignedBy: admId,
          organizationId: orgId,
          assignmentType: 'dept_role',
          assignedDate: now,
          deadline,
          status: 'Assigned'
        }
      });
      results.push(withId(assignment));
      newAssignmentsCount++;
    } catch (err) {
      if (err.code !== 'P2002' && err.code !== 11000) throw err;
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

  const admId = String(adminId);
  const orgId = String(organizationId);
  const trgId = String(trainingId);
  const empIds = employeeIds.map(id => String(id));

  const training = await prisma.training.findFirst({
    where: {
      id: trgId,
      organizationId: orgId,
      isPublished: true,
      status: 'published'
    }
  });

  if (!training) {
    throw new Error('Published training course not found in your organization');
  }

  const employees = await prisma.user.findMany({
    where: {
      id: { in: empIds },
      organizationId: orgId,
      role: 'Employee'
    }
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
      const assignment = await prisma.trainingAssignment.create({
        data: {
          employeeId: emp.id,
          trainingId: training.id,
          assignedBy: admId,
          organizationId: orgId,
          assignmentType: 'specific',
          assignedDate: now,
          deadline,
          status: 'Assigned'
        }
      });
      results.push(withId(assignment));
      newAssignmentsCount++;
    } catch (err) {
      if (err.code !== 'P2002' && err.code !== 11000) throw err;
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
