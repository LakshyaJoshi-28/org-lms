const TrainingProgress = require('../models/TrainingProgress');
const TrainingAssignment = require('../models/TrainingAssignment');
const Training = require('../models/Training');
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');

/**
 * @desc Recalculate overall employee progress percentage and update TrainingAssignment status in MongoDB
 */
const updateOverallProgress = async (trainingAssignmentId, employeeId) => {
  try {
    const assignment = await TrainingAssignment.findOne({
      _id: trainingAssignmentId,
      employeeId
    });

    if (!assignment) return null;

    const training = await Training.findById(assignment.trainingId);
    if (!training) return null;

    // Collect all required item IDs across training sections & course level
    let totalSubSections = 0;
    const requiredQuizIds = new Set();
    const requiredAssignmentIds = new Set();

    training.sections?.forEach(sec => {
      sec.subSections?.forEach(sub => {
        totalSubSections++;
        if (sub.hasQuiz && sub.quizId) {
          const qId = sub.quizId._id ? sub.quizId._id.toString() : sub.quizId.toString();
          requiredQuizIds.add(qId);
        }
        if (sub.hasAssignment && sub.assignmentId) {
          const aId = sub.assignmentId._id ? sub.assignmentId._id.toString() : sub.assignmentId.toString();
          requiredAssignmentIds.add(aId);
        }
      });
    });

    // Also include any quizzes or assignments linked directly to this trainingId
    const courseQuizzes = await Quiz.find({ trainingId: training._id });
    courseQuizzes.forEach(cq => {
      requiredQuizIds.add(cq._id.toString());
    });

    const courseAssignments = await Assignment.find({ trainingId: training._id });
    courseAssignments.forEach(ca => {
      requiredAssignmentIds.add(ca._id.toString());
    });

    const totalRequiredCount = totalSubSections + requiredQuizIds.size + requiredAssignmentIds.size;
    if (totalRequiredCount === 0) return assignment;

    // Fetch employee progress record
    let progress = await TrainingProgress.findOne({ trainingAssignmentId: assignment._id });
    if (!progress) {
      progress = new TrainingProgress({
        trainingAssignmentId: assignment._id,
        employeeId,
        trainingId: training._id,
        completedSubSectionIds: [],
        progressPercentage: 0
      });
    }

    const completedSubSectionCount = progress.completedSubSectionIds?.length || 0;

    // Count passed quizzes
    let passedQuizCount = 0;
    if (requiredQuizIds.size > 0) {
      const reqQArr = Array.from(requiredQuizIds);
      const passedQuizAttempts = await QuizAttempt.find({
        employeeId,
        $or: [
          { quizId: { $in: reqQArr } },
          { trainingAssignmentId: assignment._id }
        ],
        passed: true
      });
      const uniquePassedQuizIds = new Set();
      passedQuizAttempts.forEach(a => {
        if (a.quizId) uniquePassedQuizIds.add(a.quizId.toString());
      });
      // Cap passed quiz count at requiredQuizIds.size
      passedQuizCount = Math.min(requiredQuizIds.size, uniquePassedQuizIds.size > 0 ? uniquePassedQuizIds.size : (passedQuizAttempts.length > 0 ? requiredQuizIds.size : 0));
    }

    // Count submitted assignments
    let submittedAssignmentCount = 0;
    if (requiredAssignmentIds.size > 0) {
      const reqAArr = Array.from(requiredAssignmentIds);
      const submissions = await AssignmentSubmission.find({
        employeeId,
        $or: [
          { assignmentId: { $in: reqAArr } },
          { trainingAssignmentId: assignment._id }
        ],
        status: { $in: ['submitted', 'reviewed'] }
      });
      const uniqueSubmittedAssignmentIds = new Set();
      submissions.forEach(s => {
        if (s.assignmentId) uniqueSubmittedAssignmentIds.add(s.assignmentId.toString());
      });
      submittedAssignmentCount = Math.min(requiredAssignmentIds.size, uniqueSubmittedAssignmentIds.size > 0 ? uniqueSubmittedAssignmentIds.size : (submissions.length > 0 ? requiredAssignmentIds.size : 0));
    }

    const allSubSectionsCompleted = completedSubSectionCount >= totalSubSections;
    const allRequiredQuizzesPassed = requiredQuizIds.size === 0 || passedQuizCount >= requiredQuizIds.size;
    const allRequiredAssignmentsSubmitted = requiredAssignmentIds.size === 0 || submittedAssignmentCount >= requiredAssignmentIds.size;

    const allEverythingCompleted = allSubSectionsCompleted && allRequiredQuizzesPassed && allRequiredAssignmentsSubmitted;

    let newPercentage = 0;

    if (allEverythingCompleted) {
      // 100% RULE: Every required component is complete! Progress MUST be exactly 100%!
      newPercentage = 100;
    } else {
      const rawCompletedCount = Math.min(
        totalRequiredCount - 1,
        completedSubSectionCount + passedQuizCount + submittedAssignmentCount
      );
      newPercentage = Math.min(99, Math.round((rawCompletedCount / totalRequiredCount) * 100));
    }

    progress.progressPercentage = newPercentage;
    await progress.save();

    assignment.progressPercentage = newPercentage;
    if (newPercentage === 100 && allEverythingCompleted) {
      assignment.status = 'Completed';
      assignment.completedDate = assignment.completedDate || new Date();
    } else {
      if (assignment.status === 'Completed') {
        assignment.status = 'In Progress';
      } else if (assignment.status === 'Assigned' && (completedSubSectionCount > 0 || passedQuizCount > 0 || submittedAssignmentCount > 0)) {
        assignment.status = 'In Progress';
      }
    }
    await assignment.save();

    return { progress, assignment };
  } catch (err) {
    console.error('Error updating overall progress:', err);
    return null;
  }
};

module.exports = {
  updateOverallProgress
};
