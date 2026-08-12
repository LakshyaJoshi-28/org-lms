const User = require('../models/User');
const Department = require('../models/Department');
const Training = require('../models/Training');
const TrainingAssignment = require('../models/TrainingAssignment');
const AutoAssignmentRule = require('../models/AutoAssignmentRule');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const QuizAttempt = require('../models/QuizAttempt');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc    Comprehensive Organization Reports & Analytics Engine
 * @route   GET /api/reports/full-org-report
 * @access  Private (Organization Admin)
 */
const getFullOrgReport = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const now = new Date();

    // 1. Overview High-Level Statistics
    const totalEmployees = await User.countDocuments({ organizationId: orgId, role: 'Employee' });
    const totalInstructors = await User.countDocuments({ organizationId: orgId, role: 'Instructor' });
    const totalDepartments = await Department.countDocuments({ organizationId: orgId, status: 'active' });
    const activeTrainingsCount = await Training.countDocuments({ organizationId: orgId, isPublished: true, status: 'published' });

    const allAssignments = await TrainingAssignment.find({ organizationId: orgId })
      .populate('employeeId', 'name email departmentId jobRole profilePicture status')
      .populate({
        path: 'trainingId',
        select: 'title categoryId durationDays isMandatory',
        populate: { path: 'categoryId', select: 'name' }
      })
      .populate('assignedBy', 'name email role');

    const totalAssignments = allAssignments.length;
    const completedAssignments = allAssignments.filter(a => a.status === 'Completed').length;
    const inProgressAssignments = allAssignments.filter(a => a.status === 'In Progress').length;
    const pendingAssignments = allAssignments.filter(a => a.status === 'Assigned' && (a.progressPercentage || 0) === 0).length;
    const overdueAssignments = allAssignments.filter(a => a.status === 'Overdue').length;

    const overallComplianceRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

    // 2. Department & Role Drill-Down Analytics
    const departments = await Department.find({ organizationId: orgId, status: 'active' }).sort({ name: 1 });
    const employees = await User.find({ organizationId: orgId, role: 'Employee' })
      .select('-password')
      .populate('departmentId', 'name jobRoles');

    const departmentAnalytics = [];

    for (const dep of departments) {
      const depEmployees = employees.filter(e => {
        const dId = typeof e.departmentId === 'object' ? e.departmentId?._id : e.departmentId;
        return String(dId) === String(dep._id);
      });

      const depEmpIds = new Set(depEmployees.map(e => e._id.toString()));
      const depAssignments = allAssignments.filter(a => a.employeeId && depEmpIds.has(a.employeeId._id.toString()));

      const depTotalAssigned = depAssignments.length;
      const depCompleted = depAssignments.filter(a => a.status === 'Completed').length;
      const depInProgress = depAssignments.filter(a => a.status === 'In Progress').length;
      const depPending = depAssignments.filter(a => a.status === 'Assigned' && (a.progressPercentage || 0) === 0).length;
      const depOverdue = depAssignments.filter(a => a.status === 'Overdue').length;
      const depComplianceRate = depTotalAssigned > 0 ? Math.round((depCompleted / depTotalAssigned) * 100) : 0;

      const totalProgressSum = depAssignments.reduce((acc, a) => acc + (a.progressPercentage || 0), 0);
      const avgProgress = depTotalAssigned > 0 ? Math.round(totalProgressSum / depTotalAssigned) : 0;

      // Group by Job Roles within Department
      const allRolesInDept = Array.from(new Set([...(dep.jobRoles || []), ...depEmployees.map(e => e.jobRole).filter(Boolean)]));
      const roleAnalytics = allRolesInDept.map(roleName => {
        const roleEmployees = depEmployees.filter(e => e.jobRole === roleName);
        const roleEmpIds = new Set(roleEmployees.map(e => e._id.toString()));
        const roleAssignments = depAssignments.filter(a => a.employeeId && roleEmpIds.has(a.employeeId._id.toString()));

        const rTotal = roleAssignments.length;
        const rComp = roleAssignments.filter(a => a.status === 'Completed').length;
        const rInProg = roleAssignments.filter(a => a.status === 'In Progress').length;
        const rPend = roleAssignments.filter(a => a.status === 'Assigned' && (a.progressPercentage || 0) === 0).length;
        const rOverdue = roleAssignments.filter(a => a.status === 'Overdue').length;
        const rCompliance = rTotal > 0 ? Math.round((rComp / rTotal) * 100) : 0;

        return {
          jobRole: roleName,
          totalEmployees: roleEmployees.length,
          totalAssigned: rTotal,
          completed: rComp,
          inProgress: rInProg,
          pending: rPend,
          overdue: rOverdue,
          complianceRate: rCompliance,
          employees: roleEmployees.map(emp => {
            const empAssigns = roleAssignments.filter(a => a.employeeId._id.toString() === emp._id.toString());
            const eComp = empAssigns.filter(a => a.status === 'Completed').length;
            const eTotal = empAssigns.length;
            const eAvgProgress = eTotal > 0 ? Math.round(empAssigns.reduce((acc, a) => acc + (a.progressPercentage || 0), 0) / eTotal) : 0;
            return {
              _id: emp._id,
              name: emp.name,
              email: emp.email,
              profilePicture: emp.profilePicture,
              totalAssigned: eTotal,
              completed: eComp,
              inProgress: empAssigns.filter(a => a.status === 'In Progress').length,
              pending: empAssigns.filter(a => a.status === 'Assigned' && (a.progressPercentage || 0) === 0).length,
              overdue: empAssigns.filter(a => a.status === 'Overdue').length,
              overallProgress: eAvgProgress,
              complianceStatus: eTotal > 0 && eComp === eTotal ? 'Fully Compliant' : empAssigns.some(a => a.status === 'Overdue') ? 'At Risk' : 'In Progress'
            };
          })
        };
      });

      departmentAnalytics.push({
        departmentId: dep._id,
        departmentName: dep.name,
        totalEmployees: depEmployees.length,
        totalRoles: allRolesInDept.length,
        totalAssigned: depTotalAssigned,
        completed: depCompleted,
        inProgress: depInProgress,
        pending: depPending,
        overdue: depOverdue,
        complianceRate: depComplianceRate,
        avgEmployeeProgress: avgProgress,
        roles: roleAnalytics
      });
    }

    // 3. Employee Progress Table Analytics
    const employeeAnalytics = employees.map(emp => {
      const empAssigns = allAssignments.filter(a => a.employeeId && a.employeeId._id.toString() === emp._id.toString());
      const eTotal = empAssigns.length;
      const eComp = empAssigns.filter(a => a.status === 'Completed').length;
      const eInProg = empAssigns.filter(a => a.status === 'In Progress').length;
      const ePend = empAssigns.filter(a => a.status === 'Assigned' && (a.progressPercentage || 0) === 0).length;
      const eOverdue = empAssigns.filter(a => a.status === 'Overdue').length;
      const eAvgProgress = eTotal > 0 ? Math.round(empAssigns.reduce((acc, a) => acc + (a.progressPercentage || 0), 0) / eTotal) : 0;

      return {
        _id: emp._id,
        name: emp.name,
        email: emp.email,
        profilePicture: emp.profilePicture,
        departmentId: emp.departmentId?._id,
        departmentName: emp.departmentId?.name || 'Unassigned',
        jobRole: emp.jobRole || 'Unassigned',
        totalAssigned: eTotal,
        completed: eComp,
        inProgress: eInProg,
        pending: ePend,
        overdue: eOverdue,
        complianceRate: eTotal > 0 ? Math.round((eComp / eTotal) * 100) : 0,
        overallProgress: eAvgProgress,
        complianceStatus: eTotal > 0 && eComp === eTotal ? 'Fully Compliant' : eOverdue > 0 ? 'At Risk' : eInProg > 0 ? 'In Progress' : 'Pending',
        assignments: empAssigns.map(a => ({
          assignmentId: a._id,
          trainingTitle: a.trainingId?.title || 'Training',
          categoryName: a.trainingId?.categoryId?.name || 'General',
          isMandatory: a.trainingId?.isMandatory || a.assignmentType === 'auto',
          progressPercentage: a.progressPercentage || 0,
          status: a.status,
          assignedDate: a.assignedDate || a.createdAt,
          deadline: a.deadline,
          completedDate: a.completedDate
        }))
      };
    });

    // 4. Training-Wise Report
    const trainings = await Training.find({ organizationId: orgId, isPublished: true })
      .populate('categoryId', 'name')
      .sort({ title: 1 });

    const trainingAnalytics = trainings.map(t => {
      const tAssigns = allAssignments.filter(a => a.trainingId && a.trainingId._id.toString() === t._id.toString());
      const tTotal = tAssigns.length;
      const tComp = tAssigns.filter(a => a.status === 'Completed').length;
      const tInProg = tAssigns.filter(a => a.status === 'In Progress').length;
      const tPend = tAssigns.filter(a => a.status === 'Assigned' && (a.progressPercentage || 0) === 0).length;
      const tOverdue = tAssigns.filter(a => a.status === 'Overdue').length;
      const tCompRate = tTotal > 0 ? Math.round((tComp / tTotal) * 100) : 0;
      const tAvgProgress = tTotal > 0 ? Math.round(tAssigns.reduce((acc, a) => acc + (a.progressPercentage || 0), 0) / tTotal) : 0;

      return {
        _id: t._id,
        title: t.title,
        categoryName: t.categoryId?.name || 'General',
        durationDays: t.durationDays,
        isMandatory: t.isMandatory,
        totalAssigned: tTotal,
        completed: tComp,
        inProgress: tInProg,
        pending: tPend,
        overdue: tOverdue,
        completionRate: tCompRate,
        avgProgress: tAvgProgress,
        enrolledEmployees: tAssigns.map(a => ({
          assignmentId: a._id,
          employeeId: a.employeeId?._id,
          employeeName: a.employeeId?.name || 'Unknown',
          employeeEmail: a.employeeId?.email || '',
          profilePicture: a.employeeId?.profilePicture,
          departmentName: a.employeeId?.departmentId?.name || 'Unassigned',
          jobRole: a.employeeId?.jobRole || 'Unassigned',
          progressPercentage: a.progressPercentage || 0,
          status: a.status,
          assignedDate: a.assignedDate || a.createdAt,
          deadline: a.deadline,
          completedDate: a.completedDate
        }))
      };
    });

    // 5. Overdue Trainings Report
    const overdueReport = allAssignments
      .filter(a => a.status === 'Overdue' || (new Date(a.deadline) < now && a.status !== 'Completed'))
      .map(a => {
        const deadlineDate = new Date(a.deadline);
        const daysOverdue = Math.max(1, Math.floor((now - deadlineDate) / (1000 * 60 * 60 * 24)));
        return {
          assignmentId: a._id,
          employeeName: a.employeeId?.name || 'Unknown',
          employeeEmail: a.employeeId?.email || '',
          departmentName: a.employeeId?.departmentId?.name || 'Unassigned',
          jobRole: a.employeeId?.jobRole || 'Unassigned',
          trainingTitle: a.trainingId?.title || 'Training',
          deadline: a.deadline,
          daysOverdue,
          currentProgress: a.progressPercentage || 0,
          assignedBy: a.assignedBy?.name || 'System Auto'
        };
      });

    // 6. Mandatory & Auto-Assigned Training Rules Report (from AutoAssignmentRule MongoDB model)
    const activeAutoRules = await AutoAssignmentRule.find({ organizationId: orgId, status: 'active' })
      .populate({
        path: 'trainingId',
        select: 'title categoryId durationDays isMandatory',
        populate: { path: 'categoryId', select: 'name' }
      })
      .populate('createdBy', 'name email');

    const mandatoryTrainings = await Training.find({ organizationId: orgId, isMandatory: true, isPublished: true })
      .populate('categoryId', 'name');

    const ruleTrainingMap = new Map();

    for (const rule of activeAutoRules) {
      if (rule.trainingId) {
        ruleTrainingMap.set(rule.trainingId._id.toString(), {
          ruleId: rule._id,
          trainingId: rule.trainingId._id,
          trainingTitle: rule.trainingId.title,
          categoryName: rule.trainingId.categoryId?.name || 'General',
          customDeadlineDays: rule.customDeadlineDays,
          createdBy: rule.createdBy?.name || 'Admin',
          isAutoRule: true
        });
      }
    }

    for (const t of mandatoryTrainings) {
      if (!ruleTrainingMap.has(t._id.toString())) {
        ruleTrainingMap.set(t._id.toString(), {
          ruleId: null,
          trainingId: t._id,
          trainingTitle: t.title,
          categoryName: t.categoryId?.name || 'General',
          customDeadlineDays: t.durationDays || 30,
          createdBy: 'Admin',
          isAutoRule: false
        });
      }
    }

    const mandatoryAnalytics = Array.from(ruleTrainingMap.values()).map(ruleInfo => {
      const tAssigns = allAssignments.filter(a => a.trainingId && a.trainingId._id.toString() === ruleInfo.trainingId.toString());
      const tTotal = tAssigns.length;
      const tComp = tAssigns.filter(a => a.status === 'Completed').length;
      const tInProg = tAssigns.filter(a => a.status === 'In Progress').length;
      const tPend = tAssigns.filter(a => a.status === 'Assigned' && (a.progressPercentage || 0) === 0).length;
      const tOverdue = tAssigns.filter(a => a.status === 'Overdue').length;
      const tCompRate = tTotal > 0 ? Math.round((tComp / tTotal) * 100) : 0;

      return {
        ...ruleInfo,
        totalEmployees: totalEmployees,
        totalAssigned: tTotal,
        completed: tComp,
        inProgress: tInProg,
        pending: tPend,
        overdue: tOverdue,
        complianceRate: tCompRate,
        enrolledEmployees: tAssigns.map(a => ({
          assignmentId: a._id,
          employeeId: a.employeeId?._id,
          employeeName: a.employeeId?.name || 'Unknown',
          employeeEmail: a.employeeId?.email || '',
          profilePicture: a.employeeId?.profilePicture,
          departmentName: a.employeeId?.departmentId?.name || 'Unassigned',
          jobRole: a.employeeId?.jobRole || 'Unassigned',
          progressPercentage: a.progressPercentage || 0,
          status: a.status,
          assignedDate: a.assignedDate || a.createdAt,
          deadline: a.deadline,
          completedDate: a.completedDate
        }))
      };
    });

    // 7. Department Compliance Rankings Leaderboard
    const complianceLeaderboard = [...departmentAnalytics]
      .sort((a, b) => b.complianceRate - a.complianceRate)
      .map(d => ({
        departmentId: d.departmentId,
        departmentName: d.departmentName,
        complianceRate: d.complianceRate,
        totalEmployees: d.totalEmployees,
        totalAssigned: d.totalAssigned,
        completed: d.completed,
        inProgress: d.inProgress,
        pending: d.pending,
        overdue: d.overdue,
        status: d.totalAssigned === 0 ? 'No Assignments' : d.complianceRate === 100 ? 'Fully Compliant' : d.complianceRate >= 50 ? 'Needs Attention' : 'At Risk'
      }));

    res.status(200).json(
      new ApiResponse(
        200,
        {
          overview: {
            totalEmployees,
            totalInstructors,
            totalDepartments,
            totalActiveTrainings: activeTrainingsCount,
            totalAssignments,
            completedAssignments,
            inProgressAssignments,
            pendingAssignments,
            overdueAssignments,
            overallComplianceRate
          },
          departmentAnalytics,
          employeeAnalytics,
          trainingAnalytics,
          overdueReport,
          mandatoryAnalytics,
          complianceLeaderboard
        },
        'Full organization reports & analytics retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Organization Admin Dashboard Analytics & Department Performance
 * @route   GET /api/reports/admin-dashboard
 * @access  Private (Organization Admin)
 */
const getAdminDashboardReports = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;

    const totalEmployees = await User.countDocuments({ organizationId: orgId, role: 'Employee' });
    const totalInstructors = await User.countDocuments({ organizationId: orgId, role: 'Instructor' });
    const activeTrainingsCount = await Training.countDocuments({ organizationId: orgId, isPublished: true, status: 'published' });

    const completedAssignmentsCount = await TrainingAssignment.countDocuments({ organizationId: orgId, status: 'Completed' });
    const inProgressAssignmentsCount = await TrainingAssignment.countDocuments({ organizationId: orgId, status: 'In Progress' });
    const overdueAssignmentsCount = await TrainingAssignment.countDocuments({ organizationId: orgId, status: 'Overdue' });
    const totalAssignmentsCount = await TrainingAssignment.countDocuments({ organizationId: orgId });

    // Department Performance & Compliance Breakdown
    const departments = await Department.find({ organizationId: orgId, status: 'active' }).sort({ name: 1 });
    const departmentPerformance = [];

    for (const dep of departments) {
      const depEmployees = await User.find({ organizationId: orgId, departmentId: dep._id, role: 'Employee' }).select('_id');
      const empIds = depEmployees.map(e => e._id);

      const depTotal = await TrainingAssignment.countDocuments({ organizationId: orgId, employeeId: { $in: empIds } });
      const depCompleted = await TrainingAssignment.countDocuments({ organizationId: orgId, employeeId: { $in: empIds }, status: 'Completed' });
      const depInProgress = await TrainingAssignment.countDocuments({ organizationId: orgId, employeeId: { $in: empIds }, status: 'In Progress' });
      const depPending = await TrainingAssignment.countDocuments({ organizationId: orgId, employeeId: { $in: empIds }, status: 'Assigned', progressPercentage: 0 });
      const depOverdue = await TrainingAssignment.countDocuments({ organizationId: orgId, employeeId: { $in: empIds }, status: 'Overdue' });

      const rawRate = depTotal > 0 ? Math.round((depCompleted / depTotal) * 100) : 0;

      departmentPerformance.push({
        departmentId: dep._id,
        departmentName: dep.name,
        totalEmployees: empIds.length,
        totalAssigned: depTotal,
        totalAssignments: depTotal,
        completed: depCompleted,
        completedAssignments: depCompleted,
        pending: depPending,
        inProgress: depInProgress,
        overdue: depOverdue,
        completionRate: `${rawRate}%`,
        completionPercentage: rawRate
      });
    }

    // Recent Audit Activity Logs for Admin Dashboard
    const recentLogs = await AuditLog.find({ organizationId: orgId })
      .sort({ timestamp: -1, createdAt: -1 })
      .limit(10);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          quickStats: {
            totalEmployees,
            totalInstructors,
            activeTrainings: activeTrainingsCount,
            totalAssignments: totalAssignmentsCount,
            completedTrainings: completedAssignmentsCount,
            inProgressTrainings: inProgressAssignmentsCount,
            overdueTrainings: overdueAssignmentsCount,
            overallCompletionRate: totalAssignmentsCount > 0 ? `${Math.round((completedAssignmentsCount / totalAssignmentsCount) * 100)}%` : '0%'
          },
          departmentPerformance,
          departmentCompletion: departmentPerformance, // Alias for frontend compatibility
          recentLogs
        },
        'Admin dashboard analytics retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Detailed Employee Training Report (Admin View)
 * @route   GET /api/reports/employee/:employeeId
 * @access  Private (Admin, Instructor)
 */
const getEmployeeReport = async (req, res, next) => {
  try {
    const employee = await User.findOne({
      _id: req.params.employeeId,
      organizationId: req.user.organizationId
    })
      .select('-password')
      .populate('departmentId', 'name');

    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    const assignments = await TrainingAssignment.find({
      employeeId: employee._id,
      organizationId: req.user.organizationId
    })
      .populate('trainingId', 'title categoryId durationDays')
      .sort({ assignedDate: -1 });

    const totalAssigned = assignments.length;
    const completed = assignments.filter(a => a.status === 'Completed').length;
    const inProgress = assignments.filter(a => a.status === 'In Progress').length;
    const overdue = assignments.filter(a => a.status === 'Overdue').length;
    const locked = assignments.filter(a => a.status === 'Locked').length;

    const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          employee,
          summary: {
            totalAssigned,
            completed,
            inProgress,
            overdue,
            locked,
            completionRate: `${completionRate}%`
          },
          assignments
        },
        'Employee report retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Instructor Dashboard Analytics
 * @route   GET /api/reports/instructor-dashboard
 * @access  Private (Instructor)
 */
const getInstructorDashboardReports = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const instructorId = req.user._id;
    const now = new Date();

    const ownedTrainings = await Training.find({ createdBy: instructorId, organizationId: orgId }).sort({ createdAt: -1 });
    const trainingIds = ownedTrainings.map(t => t._id);

    const totalTrainings = ownedTrainings.length;

    const assignments = await TrainingAssignment.find({ trainingId: { $in: trainingIds } })
      .populate('employeeId', 'name email departmentId jobRole profilePicture')
      .populate('trainingId', 'title');

    const totalEnrolled = new Set(assignments.map(a => a.employeeId?._id?.toString()).filter(Boolean)).size;

    // Instructor's assignments requiring review
    const instructorAssignments = await Assignment.find({
      $or: [
        { createdBy: instructorId },
        { trainingId: { $in: trainingIds } }
      ]
    }).select('_id title trainingId');

    const assignmentIds = instructorAssignments.map(a => a._id);

    const pendingReviewsCount = await AssignmentSubmission.countDocuments({
      assignmentId: { $in: assignmentIds },
      status: 'submitted'
    });

    const overdueCount = assignments.filter(a => a.status === 'Overdue' || (new Date(a.deadline) < now && a.status !== 'Completed')).length;

    // Overdue list for instructor's trainings
    const overdueEmployees = assignments
      .filter(a => a.status === 'Overdue' || (new Date(a.deadline) < now && a.status !== 'Completed'))
      .map(a => ({
        assignmentId: a._id,
        employeeName: a.employeeId ? a.employeeId.name : 'Unknown Employee',
        employeeEmail: a.employeeId ? a.employeeId.email : '',
        employeeAvatar: a.employeeId?.profilePicture,
        trainingTitle: a.trainingId ? a.trainingId.title : 'Training Course',
        deadline: a.deadline,
        daysOverdue: Math.max(1, Math.floor((now - new Date(a.deadline)) / (1000 * 60 * 60 * 24)))
      }));

    // Recent assignment submissions requiring review
    const recentSubmissions = await AssignmentSubmission.find({
      assignmentId: { $in: assignmentIds },
      status: 'submitted'
    })
      .populate('assignmentId', 'title trainingId')
      .populate('employeeId', 'name email profilePicture')
      .sort({ submittedAt: -1, createdAt: -1 })
      .limit(5);

    const pendingSubmissions = recentSubmissions.map(sub => {
      const tr = ownedTrainings.find(t => t._id.toString() === sub.assignmentId?.trainingId?.toString());
      return {
        _id: sub._id,
        assignmentTitle: sub.assignmentId?.title || 'Assignment Submission',
        trainingTitle: tr?.title || 'Training Course',
        employeeName: sub.employeeId?.name || 'Employee',
        employeeEmail: sub.employeeId?.email || '',
        employeeAvatar: sub.employeeId?.profilePicture,
        submittedAt: sub.submittedAt || sub.createdAt
      };
    });

    // My Training Summary List for Instructor Studio
    const myTrainings = ownedTrainings.map(t => {
      const tAssigns = assignments.filter(a => a.trainingId && a.trainingId._id.toString() === t._id.toString());
      const tEnrolled = new Set(tAssigns.map(a => a.employeeId?._id?.toString()).filter(Boolean)).size;
      const tCompleted = tAssigns.filter(a => a.status === 'Completed').length;
      const tInProgress = tAssigns.filter(a => a.status === 'In Progress').length;
      const tPending = tAssigns.filter(a => a.status === 'Assigned' && (a.progressPercentage || 0) === 0).length;
      const tTotal = tAssigns.length;
      const completionRate = tTotal > 0 ? Math.round((tCompleted / tTotal) * 100) : 0;

      return {
        _id: t._id,
        title: t.title,
        status: t.status || (t.isPublished ? 'published' : 'draft'),
        enrolledCount: tEnrolled,
        totalAssigned: tTotal,
        completedCount: tCompleted,
        inProgressCount: tInProgress,
        pendingCount: tPending,
        completionRate
      };
    });

    // Recent Activity Feed
    const recentActivity = [];
    pendingSubmissions.forEach(sub => {
      recentActivity.push({
        id: `sub_${sub._id}`,
        type: 'submission',
        title: 'Assignment Submitted',
        description: `${sub.employeeName} submitted "${sub.assignmentTitle}" for ${sub.trainingTitle}`,
        timestamp: sub.submittedAt
      });
    });

    ownedTrainings.slice(0, 3).forEach(t => {
      recentActivity.push({
        id: `train_${t._id}`,
        type: 'creation',
        title: 'Training Created',
        description: `Created training course "${t.title}"`,
        timestamp: t.createdAt
      });
    });

    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json(
      new ApiResponse(
        200,
        {
          stats: {
            createdTrainings: totalTrainings,
            totalTrainings: totalTrainings,
            totalEnrolled: totalEnrolled,
            activeEmployees: totalEnrolled,
            pendingReviews: pendingReviewsCount,
            overdueEnrollments: overdueCount
          },
          myTrainings,
          pendingSubmissions,
          overdueEmployees,
          recentActivity
        },
        'Instructor dashboard analytics retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Employee Personal Training Report & Stats
 * @route   GET /api/reports/my-report
 * @access  Private (Employee)
 */
const getMyReport = async (req, res, next) => {
  try {
    const employeeId = req.user._id;
    const orgId = req.user.organizationId;
    const now = new Date();

    // 1. Fetch Employee details with department & organization
    const employee = await User.findById(employeeId)
      .select('name email role jobRole profilePicture departmentId organizationId createdAt')
      .populate('departmentId', 'name')
      .populate('organizationId', 'name code');

    // 2. Fetch all Training Assignments for Employee
    const assignments = await TrainingAssignment.find({
      employeeId,
      organizationId: orgId
    })
      .populate({
        path: 'trainingId',
        select: 'title description thumbnailUrl durationDays isMandatory createdBy categoryId sections',
        populate: [
          { path: 'categoryId', select: 'name' },
          { path: 'createdBy', select: 'name email profilePicture' }
        ]
      })
      .sort({ createdAt: -1 });

    // 3. Fetch Quiz Attempts for Employee
    const quizAttempts = await QuizAttempt.find({ employeeId })
      .populate({
        path: 'quizId',
        select: 'title passingScorePercent questions trainingId subSectionId'
      })
      .sort({ createdAt: -1 });

    // 4. Fetch Assignment Submissions for Employee
    const assignmentSubmissions = await AssignmentSubmission.find({ employeeId })
      .populate({
        path: 'assignmentId',
        select: 'title instructions maxScore trainingId subSectionId'
      })
      .sort({ submittedAt: -1 });

    // 5. Calculate Metrics
    const totalAssigned = assignments.length;
    const completedAssignments = assignments.filter(a => a.status === 'Completed' || (a.progressPercentage || 0) === 100).length;
    const overdueAssignments = assignments.filter(a => a.status === 'Overdue' || (new Date(a.deadline) < now && a.status !== 'Completed')).length;
    const inProgressAssignments = assignments.filter(a => (a.status === 'In Progress' || (a.progressPercentage || 0) > 0) && a.status !== 'Completed' && !overdueAssignments).length;
    const notStartedAssignments = Math.max(0, totalAssigned - completedAssignments - inProgressAssignments - overdueAssignments);

    const overallProgress = totalAssigned > 0
      ? Math.round(assignments.reduce((sum, a) => sum + (a.progressPercentage || 0), 0) / totalAssigned)
      : 0;

    const totalQuizAttempts = quizAttempts.length;
    const quizzesPassed = quizAttempts.filter(q => q.passed).length;
    const quizzesFailed = quizAttempts.filter(q => !q.passed).length;
    const averageQuizScore = totalQuizAttempts > 0
      ? Math.round(quizAttempts.reduce((sum, q) => sum + (q.percentage || 0), 0) / totalQuizAttempts)
      : 0;

    const bestQuizScore = totalQuizAttempts > 0
      ? Math.max(...quizAttempts.map(q => q.percentage || 0))
      : null;

    // 6. Format Training Assignment Transcript Items
    const transcript = assignments.map(a => {
      const t = a.trainingId;
      const isOverdue = a.status === 'Overdue' || (new Date(a.deadline) < now && a.status !== 'Completed');

      let displayStatus = 'Not Started';
      if (a.status === 'Completed' || (a.progressPercentage || 0) === 100) displayStatus = 'Completed';
      else if (isOverdue) displayStatus = 'Overdue';
      else if (a.status === 'In Progress' || (a.progressPercentage || 0) > 0) displayStatus = 'In Progress';

      // Find highest score for quiz in this training
      const trainingQuizAttempts = quizAttempts.filter(q => q.quizId && t && q.quizId.trainingId && q.quizId.trainingId.toString() === t._id.toString());
      let quizScoreDisplay = 'N/A';
      if (trainingQuizAttempts.length > 0) {
        const bestScore = Math.max(...trainingQuizAttempts.map(q => q.percentage || 0));
        quizScoreDisplay = `${bestScore}%`;
      }

      // Find assignment submission status for this training
      const trainingSubmissions = assignmentSubmissions.filter(s => s.assignmentId && t && s.assignmentId.trainingId && s.assignmentId.trainingId.toString() === t._id.toString());
      let assignmentStatusDisplay = 'N/A';
      if (trainingSubmissions.length > 0) {
        assignmentStatusDisplay = trainingSubmissions[0].status === 'reviewed' ? 'Reviewed' : 'Submitted';
      }

      return {
        _id: a._id,
        trainingId: t ? t._id : null,
        title: t ? t.title : 'Training Course',
        thumbnailUrl: t ? t.thumbnailUrl : '',
        description: t ? t.description : '',
        category: t?.categoryId?.name || 'General Training',
        instructorName: t?.createdBy?.name || 'Instructor',
        instructorEmail: t?.createdBy?.email || '',
        assignedDate: a.assignedDate || a.createdAt,
        deadline: a.deadline,
        completedDate: a.completedDate,
        progressPercentage: a.progressPercentage || 0,
        status: displayStatus,
        quizScore: quizScoreDisplay,
        assignmentStatus: assignmentStatusDisplay
      };
    });

    // 7. Format Detailed Quiz Attempts (Enriching answer text for new and historical attempts)
    const formattedQuizAttempts = quizAttempts.map(att => {
      const quizObj = att.quizId;
      const questionsList = quizObj ? quizObj.questions : [];

      const answers = (att.answers || []).map((ans, idx) => {
        const qIdx = ans.questionIndex !== undefined ? ans.questionIndex : idx;
        const qInQuiz = questionsList[qIdx];

        const qText = ans.questionText || (qInQuiz ? qInQuiz.questionText : `Question ${idx + 1}`);
        const opts = (ans.options && ans.options.length > 0) ? ans.options : (qInQuiz ? qInQuiz.options : []);

        let selOptIdx = ans.selectedOptionIndex;
        if (selOptIdx === undefined && ans.selectedOptionIdx !== undefined) {
          selOptIdx = ans.selectedOptionIdx;
        }

        let selAnsText = ans.selectedAnswerText || '';
        if (!selAnsText && selOptIdx !== null && selOptIdx !== undefined && opts && opts[selOptIdx]) {
          selAnsText = opts[selOptIdx];
        }

        let corrAnsIdx = ans.correctAnswerIndex;
        if (corrAnsIdx === undefined && qInQuiz) {
          corrAnsIdx = qInQuiz.correctAnswerIndex;
        }

        let corrAnsText = ans.correctAnswerText || '';
        if (!corrAnsText && corrAnsIdx !== null && corrAnsIdx !== undefined && opts && opts[corrAnsIdx]) {
          corrAnsText = opts[corrAnsIdx];
        }

        let status = 'incorrect';
        let dataUnavailable = false;

        if (ans.isCorrect === true) {
          status = 'correct';
        } else if (selOptIdx === null || selOptIdx === undefined || selOptIdx < 0) {
          if (!selAnsText && (!opts || opts.length === 0)) {
            status = 'data_unavailable';
            dataUnavailable = true;
          } else {
            status = 'not_answered';
          }
        } else {
          status = 'incorrect';
        }

        return {
          questionIndex: qIdx,
          questionText: qText,
          selectedOptionIndex: selOptIdx,
          selectedAnswerText: selAnsText,
          correctAnswerIndex: corrAnsIdx,
          correctAnswerText: corrAnsText,
          options: opts,
          isCorrect: Boolean(ans.isCorrect),
          status,
          dataUnavailable
        };
      });

      return {
        _id: att._id,
        quizId: att.quizId?._id,
        quizTitle: att.quizId?.title || 'Section Quiz',
        attemptNumber: att.attemptNumber || 1,
        totalScore: att.totalScore,
        maxScore: att.maxScore,
        percentage: att.percentage,
        passingScorePercent: att.passingScorePercent || att.quizId?.passingScorePercent || 70,
        passed: att.passed,
        createdAt: att.createdAt,
        answers
      };
    });

    // 8. Format Assignment Submissions
    const formattedAssignmentSubmissions = assignmentSubmissions.map(sub => ({
      _id: sub._id,
      assignmentId: sub.assignmentId?._id,
      assignmentTitle: sub.assignmentId?.title || 'Project Assignment',
      instructions: sub.assignmentId?.instructions || '',
      maxScore: sub.assignmentId?.maxScore || 100,
      submissionType: sub.submissionType,
      githubUrl: sub.githubUrl || '',
      fileUrl: sub.fileUrl || '',
      status: sub.status,
      submittedAt: sub.submittedAt || sub.createdAt,
      score: sub.score,
      feedback: sub.feedback
    }));

    res.status(200).json(
      new ApiResponse(
        200,
        {
          employee: {
            id: employee ? employee._id : req.user._id,
            name: employee ? employee.name : req.user.name,
            email: employee ? employee.email : req.user.email,
            jobRole: employee?.jobRole || 'Employee',
            department: employee?.departmentId?.name || 'Unassigned',
            organization: employee?.organizationId?.name || 'Organization'
          },
          overview: {
            totalAssignments: totalAssigned,
            totalAssigned,
            completedAssignments,
            completedCourses: completedAssignments,
            inProgressAssignments,
            notStartedAssignments,
            overdueAssignments,
            overallProgress,
            averageQuizScore,
            totalQuizAttempts,
            quizzesPassed,
            quizzesFailed,
            bestQuizScore,
            totalAssignmentsSubmitted: assignmentSubmissions.length
          },
          assignments: transcript,
          quizAttempts: formattedQuizAttempts,
          assignmentSubmissions: formattedAssignmentSubmissions
        },
        'Employee personal report retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFullOrgReport,
  getAdminDashboardReports,
  getEmployeeReport,
  getInstructorDashboardReports,
  getMyReport
};
