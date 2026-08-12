const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Training = require('../models/Training');
const { updateOverallProgress } = require('../services/progressService');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc    Create Assignment for a SubSection
 * @route   POST /api/assignments
 * @access  Private (Instructor, Admin)
 */
const createAssignment = async (req, res, next) => {
  try {
    const { title, instructions, trainingId, sectionId, subSectionId, maxScore } = req.body;

    if (!title || !instructions || !trainingId) {
      throw new ApiError(400, 'Please provide title, instructions, and trainingId');
    }

    const training = await Training.findOne({ _id: trainingId, organizationId: req.user.organizationId });
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }

    if (req.user.role === 'Instructor' && training.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized to add assignment to this training');
    }

    let targetSubSectionId = subSectionId;
    if (!targetSubSectionId && sectionId) {
      const section = training.sections.id(sectionId);
      if (section && section.subSections.length > 0) {
        targetSubSectionId = section.subSections[0]._id;
      }
    }

    const assignment = await Assignment.create({
      title,
      instructions,
      trainingId,
      subSectionId: targetSubSectionId || training._id,
      maxScore: maxScore || 100,
      createdBy: req.user._id,
      organizationId: req.user.organizationId
    });

    if (sectionId && targetSubSectionId) {
      const section = training.sections.id(sectionId);
      if (section) {
        const subSection = section.subSections.id(targetSubSectionId);
        if (subSection) {
          subSection.hasAssignment = true;
          subSection.assignmentId = assignment._id;
          await training.save();
        }
      }
    }

    res.status(201).json(new ApiResponse(201, { assignment }, 'Assignment created successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Assignment by ID (or subSectionId / trainingId)
 * @route   GET /api/assignments/:id
 * @access  Private
 */
const getAssignmentById = async (req, res, next) => {
  try {
    let assignment = await Assignment.findOne({ _id: req.params.id, organizationId: req.user.organizationId })
      .populate('createdBy', 'name email');

    if (!assignment) {
      assignment = await Assignment.findOne({ subSectionId: req.params.id, organizationId: req.user.organizationId })
        .populate('createdBy', 'name email');
    }

    if (!assignment) {
      assignment = await Assignment.findOne({ trainingId: req.params.id, organizationId: req.user.organizationId })
        .populate('createdBy', 'name email');
    }

    if (!assignment) {
      throw new ApiError(404, 'Assignment not found');
    }

    // Check if current user has already submitted
    const userSubmission = await AssignmentSubmission.findOne({
      assignmentId: assignment._id,
      employeeId: req.user._id
    }).populate('reviewedBy', 'name email');

    res.status(200).json(new ApiResponse(200, { assignment, userSubmission }, 'Assignment details retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Assignment
 * @route   PUT /api/assignments/:id
 * @access  Private (Instructor owner, Admin)
 */
const updateAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!assignment) {
      throw new ApiError(404, 'Assignment not found');
    }

    if (req.user.role === 'Instructor' && assignment.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized to update this assignment');
    }

    const { title, instructions, maxScore } = req.body;

    if (title) assignment.title = title;
    if (instructions) assignment.instructions = instructions;
    if (maxScore) assignment.maxScore = maxScore;

    await assignment.save();

    res.status(200).json(new ApiResponse(200, { assignment }, 'Assignment updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit Assignment (GitHub Link or File Upload)
 * @route   POST /api/assignments/:id/submit
 * @access  Private (Employee)
 */
const submitAssignment = async (req, res, next) => {
  try {
    const { submissionType, githubUrl, fileUrl, filePublicId, trainingAssignmentId } = req.body;

    if (!submissionType || !['github', 'file'].includes(submissionType)) {
      throw new ApiError(400, 'Invalid submission type. Must be "github" or "file"');
    }

    if (submissionType === 'github') {
      if (!githubUrl || !githubUrl.trim()) {
        throw new ApiError(400, 'GitHub Repository URL is required');
      }
      if (!githubUrl.includes('github.com')) {
        throw new ApiError(400, 'Please enter a valid GitHub Repository URL (e.g., https://github.com/user/repository)');
      }
    }

    if (submissionType === 'file' && (!fileUrl || !fileUrl.trim())) {
      throw new ApiError(400, 'File upload is required for file submission');
    }

    let assignment = await Assignment.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!assignment) {
      assignment = await Assignment.findOne({ subSectionId: req.params.id, organizationId: req.user.organizationId });
    }
    if (!assignment) {
      assignment = await Assignment.findOne({ trainingId: req.params.id, organizationId: req.user.organizationId });
    }

    if (!assignment) {
      throw new ApiError(404, 'Assignment not found');
    }

    // Upsert employee submission
    let submission = await AssignmentSubmission.findOne({
      assignmentId: assignment._id,
      employeeId: req.user._id
    });

    if (submission) {
      submission.submissionType = submissionType;
      submission.githubUrl = githubUrl ? githubUrl.trim() : '';
      submission.fileUrl = fileUrl ? fileUrl.trim() : '';
      submission.filePublicId = filePublicId || '';
      submission.status = 'submitted';
      submission.submittedAt = Date.now();
      await submission.save();
    } else {
      submission = await AssignmentSubmission.create({
        assignmentId: assignment._id,
        trainingAssignmentId: trainingAssignmentId || null,
        employeeId: req.user._id,
        submissionType,
        githubUrl: githubUrl ? githubUrl.trim() : '',
        fileUrl: fileUrl ? fileUrl.trim() : '',
        filePublicId: filePublicId || '',
        status: 'submitted'
      });
    }

    if (trainingAssignmentId) {
      await updateOverallProgress(trainingAssignmentId, req.user._id);
    }

    res.status(201).json(new ApiResponse(201, { submission }, 'Assignment submitted successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Submissions for a Specific Assignment or Training
 * @route   GET /api/assignments/:id/submissions
 * @access  Private (Instructor, Admin)
 */
const getAssignmentSubmissions = async (req, res, next) => {
  try {
    const idParam = req.params.id;

    // Search assignments by _id or trainingId
    let assignments = await Assignment.find({ _id: idParam, organizationId: req.user.organizationId });
    if (assignments.length === 0) {
      assignments = await Assignment.find({ trainingId: idParam, organizationId: req.user.organizationId });
    }

    if (assignments.length === 0) {
      // Return empty list if no assignments exist for this training
      return res.status(200).json(new ApiResponse(200, { submissions: [] }, 'No submissions found for training'));
    }

    // Filter by instructor ownership if Instructor
    if (req.user.role === 'Instructor') {
      assignments = assignments.filter(a => a.createdBy.toString() === req.user._id.toString());
    }

    const assignmentIds = assignments.map(a => a._id);
    const submissions = await AssignmentSubmission.find({ assignmentId: { $in: assignmentIds } })
      .populate('employeeId', 'name email profilePicture departmentId jobRole')
      .populate({
        path: 'assignmentId',
        select: 'title instructions maxScore trainingId',
        populate: { path: 'trainingId', select: 'title' }
      })
      .populate('reviewedBy', 'name email')
      .sort({ submittedAt: -1, createdAt: -1 });

    res.status(200).json(new ApiResponse(200, { submissions }, 'Assignment submissions retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get All Assignment Submissions for Logged-in Instructor
 * @route   GET /api/assignments/instructor-submissions
 * @access  Private (Instructor, Admin)
 */
const getInstructorSubmissions = async (req, res, next) => {
  try {
    const { trainingId } = req.query;

    const ownedTrainings = await Training.find({
      createdBy: req.user._id,
      organizationId: req.user.organizationId
    }).select('_id title');

    const ownedTrainingIds = ownedTrainings.map(t => t._id);

    let targetTrainingIds = ownedTrainingIds;
    if (trainingId && trainingId !== 'all') {
      targetTrainingIds = ownedTrainingIds.filter(id => id.toString() === trainingId.toString());
    }

    const assignments = await Assignment.find({
      $or: [
        { trainingId: { $in: targetTrainingIds } },
        { createdBy: req.user._id }
      ]
    }).select('_id title trainingId');

    const assignmentIds = assignments.map(a => a._id);

    const submissions = await AssignmentSubmission.find({ assignmentId: { $in: assignmentIds } })
      .populate('employeeId', 'name email profilePicture departmentId jobRole')
      .populate({
        path: 'assignmentId',
        select: 'title instructions maxScore trainingId',
        populate: { path: 'trainingId', select: 'title' }
      })
      .populate('reviewedBy', 'name email')
      .sort({ submittedAt: -1, createdAt: -1 });

    // Filter by trainingId if specified
    const filteredSubmissions = trainingId && trainingId !== 'all'
      ? submissions.filter(s => s.assignmentId?.trainingId?._id?.toString() === trainingId.toString())
      : submissions;

    const totalSubmissions = filteredSubmissions.length;
    const pendingReviews = filteredSubmissions.filter(s => s.status === 'submitted').length;
    const reviewedCount = filteredSubmissions.filter(s => s.status === 'reviewed').length;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          stats: {
            totalSubmissions,
            pendingReviews,
            reviewedCount
          },
          submissions: filteredSubmissions,
          trainings: ownedTrainings
        },
        'Instructor assignment submissions retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Review/Grade Assignment Submission
 * @route   PUT /api/assignments/submissions/:submissionId/review
 * @access  Private (Instructor, Admin)
 */
const reviewSubmission = async (req, res, next) => {
  try {
    const { grade, feedback, score } = req.body;

    const submission = await AssignmentSubmission.findById(req.params.submissionId)
      .populate({
        path: 'assignmentId',
        select: 'createdBy maxScore title'
      });

    if (!submission) {
      throw new ApiError(404, 'Submission not found');
    }

    if (req.user.role === 'Instructor' && submission.assignmentId.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized to review this submission');
    }

    const validGrades = ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement', 'Poor'];

    if (grade && validGrades.includes(grade)) {
      submission.grade = grade;
    } else if (!submission.grade) {
      submission.grade = 'Good';
    }

    if (score !== undefined && !isNaN(Number(score))) {
      submission.score = Number(score);
    }

    if (feedback !== undefined) submission.feedback = feedback;
    submission.status = 'reviewed';
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = Date.now();

    await submission.save();

    res.status(200).json(new ApiResponse(200, { submission }, 'Submission evaluated & grade saved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get All Reviewed Assignment Feedback for Logged-in Employee
 * @route   GET /api/assignments/my-feedback
 * @access  Private (Employee)
 */
const getEmployeeFeedback = async (req, res, next) => {
  try {
    const submissions = await AssignmentSubmission.find({
      employeeId: req.user._id,
      status: 'reviewed'
    })
      .populate({
        path: 'assignmentId',
        select: 'title instructions maxScore trainingId',
        populate: {
          path: 'trainingId',
          select: 'title createdBy categoryId',
          populate: [
            { path: 'createdBy', select: 'name email profilePicture' },
            { path: 'categoryId', select: 'name' }
          ]
        }
      })
      .populate('reviewedBy', 'name email profilePicture')
      .sort({ reviewedAt: -1, updatedAt: -1 });

    res.status(200).json(
      new ApiResponse(
        200,
        { submissions },
        'Employee reviewed assignment feedback retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAssignment,
  getAssignmentById,
  updateAssignment,
  submitAssignment,
  getAssignmentSubmissions,
  getInstructorSubmissions,
  getEmployeeFeedback,
  reviewSubmission
};
