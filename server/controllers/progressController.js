const TrainingProgress = require('../models/TrainingProgress');
const TrainingAssignment = require('../models/TrainingAssignment');
const Training = require('../models/Training');
const QuizAttempt = require('../models/QuizAttempt');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const { updateOverallProgress } = require('../services/progressService');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc    Mark SubSection (Video/Text Lesson) as Completed & Recalculate Progress
 * @route   POST /api/progress/complete-subsection
 * @access  Private (Employee)
 */
const completeSubSection = async (req, res, next) => {
  try {
    const { trainingAssignmentId, subSectionId } = req.body;

    if (!trainingAssignmentId || !subSectionId) {
      throw new ApiError(400, 'trainingAssignmentId and subSectionId are required');
    }

    const assignment = await TrainingAssignment.findOne({
      _id: trainingAssignmentId,
      employeeId: req.user._id
    });

    if (!assignment) {
      throw new ApiError(404, 'Training assignment not found');
    }

    if (assignment.lockStatus && assignment.lockStatus.isLocked) {
      throw new ApiError(403, 'This training is locked by your instructor. You cannot continue learning until unlocked.');
    }

    const training = await Training.findById(assignment.trainingId);
    if (!training) {
      throw new ApiError(404, 'Training details not found');
    }

    // Locate subSection in training sections
    let targetSubSection = null;
    training.sections.forEach(section => {
      section.subSections.forEach(sub => {
        if (sub._id.toString() === subSectionId.toString()) {
          targetSubSection = sub;
        }
      });
    });

    if (!targetSubSection) {
      throw new ApiError(404, 'Sub-section not found in training');
    }

    // Fetch or create TrainingProgress record
    let progress = await TrainingProgress.findOne({ trainingAssignmentId: assignment._id });

    if (!progress) {
      progress = new TrainingProgress({
        trainingAssignmentId: assignment._id,
        employeeId: req.user._id,
        trainingId: training._id,
        completedSubSectionIds: [],
        lastAccessedSubSectionId: subSectionId,
        progressPercentage: 0
      });
    }

    // Add subSectionId if not already present
    const completedStrList = progress.completedSubSectionIds.map(id => id.toString());
    if (!completedStrList.includes(subSectionId.toString())) {
      progress.completedSubSectionIds.push(subSectionId);
    }
    progress.lastAccessedSubSectionId = subSectionId;
    await progress.save();

    // Recalculate overall progress dynamically via progressService
    const result = await updateOverallProgress(assignment._id, req.user._id);

    const finalProgress = result ? result.progress : progress;
    const finalAssignment = result ? result.assignment : assignment;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          progress: finalProgress,
          assignmentStatus: finalAssignment.status,
          percentage: finalAssignment.progressPercentage
        },
        finalAssignment.progressPercentage === 100 ? 'Training completed!' : 'Lesson marked complete successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Training Progress for an Assignment
 * @route   GET /api/progress/:trainingAssignmentId
 * @access  Private
 */
const getProgressByAssignment = async (req, res, next) => {
  try {
    const assignment = await TrainingAssignment.findById(req.params.trainingAssignmentId)
      .populate({
        path: 'trainingId',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      })
      .populate('employeeId', 'name email');

    if (!assignment) {
      throw new ApiError(404, 'Training assignment not found');
    }

    const progress = await TrainingProgress.findOne({ trainingAssignmentId: assignment._id });

    // Fetch ALL completed quiz attempts for this employee (both passed & failed attempts with full evaluation)
    const quizAttempts = await QuizAttempt.find({
      employeeId: req.user._id,
      status: { $ne: 'in_progress' }
    })
      .sort({ createdAt: -1 })
      .select('quizId passed percentage totalScore maxScore answers status createdAt');

    // Fetch assignment submissions
    const assignmentSubmissions = await AssignmentSubmission.find({
      employeeId: req.user._id
    }).select('assignmentId submissionType githubUrl fileUrl status submittedAt score feedback');

    res.status(200).json(
      new ApiResponse(
        200,
        {
          assignment,
          progress: progress || { completedSubSectionIds: [], progressPercentage: assignment.progressPercentage, lastAccessedSubSectionId: null },
          quizAttempts,
          assignmentSubmissions
        },
        'Progress retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  completeSubSection,
  getProgressByAssignment
};
