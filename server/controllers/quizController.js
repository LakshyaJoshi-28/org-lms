const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Training = require('../models/Training');
const { updateOverallProgress } = require('../services/progressService');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc    Create Quiz for a SubSection
 * @route   POST /api/quizzes
 * @access  Private (Instructor, Admin)
 */
const createQuiz = async (req, res, next) => {
  try {
    const { title, trainingId, sectionId, subSectionId, questions, timeLimitMinutes, passingScorePercent } = req.body;

    if (!title || !trainingId || !questions || !questions.length) {
      throw new ApiError(400, 'Please provide title, trainingId, and questions');
    }

    const training = await Training.findOne({ _id: trainingId, organizationId: req.user.organizationId });
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }

    if (req.user.role === 'Instructor' && training.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized to add quiz to this training');
    }

    let targetSubSectionId = subSectionId;
    if (!targetSubSectionId && sectionId) {
      const section = training.sections.id(sectionId);
      if (section && section.subSections.length > 0) {
        targetSubSectionId = section.subSections[0]._id;
      }
    }

    const quiz = await Quiz.create({
      title,
      trainingId,
      subSectionId: targetSubSectionId || training._id,
      questions,
      timeLimitMinutes: timeLimitMinutes || 15,
      passingScorePercent: passingScorePercent || 70,
      createdBy: req.user._id,
      organizationId: req.user.organizationId
    });

    if (sectionId && targetSubSectionId) {
      const section = training.sections.id(sectionId);
      if (section) {
        const subSection = section.subSections.id(targetSubSectionId);
        if (subSection) {
          subSection.hasQuiz = true;
          subSection.quizId = quiz._id;
          await training.save();
        }
      }
    }

    res.status(201).json(new ApiResponse(201, { quiz }, 'Quiz created successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Quiz by ID (or by SubSection/Training ID, Masks correct answers for Employees)
 * @route   GET /api/quizzes/:id
 * @access  Private
 */
const getQuizById = async (req, res, next) => {
  try {
    let quiz = await Quiz.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!quiz) {
      quiz = await Quiz.findOne({ subSectionId: req.params.id, organizationId: req.user.organizationId });
    }
    if (!quiz) {
      quiz = await Quiz.findOne({ trainingId: req.params.id, organizationId: req.user.organizationId });
    }

    if (!quiz) {
      throw new ApiError(404, 'Quiz not found');
    }

    const quizObj = quiz.toObject();

    // Mask correct answers if employee is attempting the quiz
    if (req.user.role === 'Employee') {
      quizObj.questions = quizObj.questions.map(q => {
        const { correctAnswerIndex, ...rest } = q;
        return rest;
      });
    }

    res.status(200).json(new ApiResponse(200, { quiz: quizObj }, 'Quiz retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Start Quiz Attempt & Track Start Time
 * @route   POST /api/quizzes/:id/start
 * @access  Private (Employee)
 */
const startQuiz = async (req, res, next) => {
  try {
    const { trainingAssignmentId } = req.body;

    let quiz = await Quiz.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!quiz) {
      quiz = await Quiz.findOne({ subSectionId: req.params.id, organizationId: req.user.organizationId });
    }
    if (!quiz) {
      quiz = await Quiz.findOne({ trainingId: req.params.id, organizationId: req.user.organizationId });
    }

    if (!quiz) {
      throw new ApiError(404, 'Quiz not found');
    }

    // Search for active in_progress attempt
    let attempt = await QuizAttempt.findOne({
      quizId: quiz._id,
      employeeId: req.user._id,
      status: 'in_progress'
    });

    const now = Date.now();
    const limitMs = (quiz.timeLimitMinutes || 15) * 60 * 1000;

    if (attempt) {
      const startTime = new Date(attempt.startTime).getTime();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const remainingSeconds = Math.max(0, Math.floor((limitMs / 1000) - elapsedSeconds));

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            attempt,
            startTime: attempt.startTime,
            timeLimitMinutes: quiz.timeLimitMinutes,
            remainingSeconds
          },
          'Quiz attempt in progress'
        )
      );
    }

    // Create new in_progress attempt
    const previousAttemptsCount = await QuizAttempt.countDocuments({
      quizId: quiz._id,
      employeeId: req.user._id,
      status: 'completed'
    });

    attempt = await QuizAttempt.create({
      quizId: quiz._id,
      trainingAssignmentId: trainingAssignmentId || null,
      employeeId: req.user._id,
      status: 'in_progress',
      startTime: new Date(now),
      attemptNumber: previousAttemptsCount + 1
    });

    res.status(201).json(
      new ApiResponse(
        201,
        {
          attempt,
          startTime: attempt.startTime,
          timeLimitMinutes: quiz.timeLimitMinutes,
          remainingSeconds: Math.floor(limitMs / 1000)
        },
        'Quiz attempt started'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Quiz
 * @route   PUT /api/quizzes/:id
 * @access  Private (Instructor owner, Admin)
 */
const updateQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!quiz) {
      throw new ApiError(404, 'Quiz not found');
    }

    if (req.user.role === 'Instructor' && quiz.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized to update this quiz');
    }

    const { title, questions, timeLimitMinutes, passingScorePercent } = req.body;

    if (title) quiz.title = title;
    if (questions) quiz.questions = questions;
    if (timeLimitMinutes) quiz.timeLimitMinutes = timeLimitMinutes;
    if (passingScorePercent) quiz.passingScorePercent = passingScorePercent;

    await quiz.save();

    res.status(200).json(new ApiResponse(200, { quiz }, 'Quiz updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit Quiz Answers & Calculate Result (Idempotent & Safe for Timeouts)
 * @route   POST /api/quizzes/:id/submit
 * @access  Private (Employee)
 */
const submitQuiz = async (req, res, next) => {
  try {
    const { userAnswers, trainingAssignmentId, attemptId } = req.body; // userAnswers: [{ questionIndex, selectedOptionIndex }]

    if (!userAnswers || !Array.isArray(userAnswers)) {
      throw new ApiError(400, 'Please provide userAnswers array');
    }

    let quiz = await Quiz.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!quiz) {
      quiz = await Quiz.findOne({ subSectionId: req.params.id, organizationId: req.user.organizationId });
    }
    if (!quiz) {
      quiz = await Quiz.findOne({ trainingId: req.params.id, organizationId: req.user.organizationId });
    }

    if (!quiz) {
      throw new ApiError(404, 'Quiz not found');
    }

    // Check for existing attempt (by attemptId or active in_progress attempt)
    let attempt;
    if (attemptId) {
      attempt = await QuizAttempt.findOne({ _id: attemptId, employeeId: req.user._id });
    }
    if (!attempt) {
      attempt = await QuizAttempt.findOne({
        quizId: quiz._id,
        employeeId: req.user._id,
        status: 'in_progress'
      });
    }

    // Idempotency check: if attempt is already completed, return existing result without error
    if (attempt && attempt.status === 'completed') {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            attempt,
            passingScorePercent: quiz.passingScorePercent,
            percentage: attempt.percentage,
            passed: attempt.passed,
            evaluatedAnswers: attempt.answers
          },
          attempt.passed ? 'Congratulations! You passed the quiz.' : `Quiz failed (${attempt.percentage}%). Required score: ${quiz.passingScorePercent}%.`
        )
      );
    }

    let totalScore = 0;
    let maxScore = 0;
    const evaluatedAnswers = [];

    quiz.questions.forEach((q, idx) => {
      const qScore = q.score || 1;
      maxScore += qScore;

      const userAns = userAnswers.find(a => a.questionIndex === idx || a.questionIdx === idx);
      const rawOpt = userAns
        ? (userAns.selectedOptionIndex !== undefined ? userAns.selectedOptionIndex : userAns.selectedOptionIdx)
        : null;

      const selectedOpt = rawOpt !== null && rawOpt !== undefined && !isNaN(Number(rawOpt))
        ? Number(rawOpt)
        : null;

      const hasSelected = selectedOpt !== null && selectedOpt >= 0 && selectedOpt < (q.options ? q.options.length : 0);
      const isCorrect = hasSelected && selectedOpt === q.correctAnswerIndex;

      if (isCorrect) {
        totalScore += qScore;
      }

      evaluatedAnswers.push({
        questionIndex: idx,
        questionText: q.questionText || `Question ${idx + 1}`,
        selectedOptionIndex: hasSelected ? selectedOpt : null,
        selectedAnswerText: hasSelected ? (q.options[selectedOpt] || '') : '',
        correctAnswerIndex: q.correctAnswerIndex,
        correctAnswerText: (q.options && q.options[q.correctAnswerIndex]) || '',
        options: q.options || [],
        isCorrect
      });
    });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentage >= quiz.passingScorePercent;

    if (attempt) {
      attempt.status = 'completed';
      attempt.endTime = new Date();
      attempt.answers = evaluatedAnswers;
      attempt.totalScore = totalScore;
      attempt.maxScore = maxScore;
      attempt.percentage = percentage;
      attempt.passed = passed;
      await attempt.save();
    } else {
      const previousAttemptsCount = await QuizAttempt.countDocuments({
        quizId: quiz._id,
        employeeId: req.user._id,
        status: 'completed'
      });

      attempt = await QuizAttempt.create({
        quizId: quiz._id,
        trainingAssignmentId: trainingAssignmentId || null,
        employeeId: req.user._id,
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        answers: evaluatedAnswers,
        totalScore,
        maxScore,
        percentage,
        passed,
        attemptNumber: previousAttemptsCount + 1
      });
    }

    let targetAssignmentId = trainingAssignmentId;
    if (!targetAssignmentId && quiz.trainingId) {
      const foundTa = await TrainingAssignment.findOne({ trainingId: quiz.trainingId, employeeId: req.user._id });
      if (foundTa) targetAssignmentId = foundTa._id;
    }

    if (targetAssignmentId && passed) {
      await updateOverallProgress(targetAssignmentId, req.user._id);
    }

    res.status(200).json(
      new ApiResponse(
        200,
        {
          attempt,
          passingScorePercent: quiz.passingScorePercent,
          percentage,
          passed,
          evaluatedAnswers
        },
        passed ? 'Congratulations! You passed the quiz.' : `Quiz failed (${percentage}%). Required score: ${quiz.passingScorePercent}%. Please retake.`
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Quiz Attempts for Employee / Quiz
 * @route   GET /api/quizzes/:id/attempts
 * @access  Private
 */
const getQuizAttempts = async (req, res, next) => {
  try {
    let quiz = await Quiz.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!quiz) {
      quiz = await Quiz.findOne({ subSectionId: req.params.id, organizationId: req.user.organizationId });
    }

    const quizId = quiz ? quiz._id : req.params.id;

    let query = { quizId };
    if (req.user.role === 'Employee') {
      query.employeeId = req.user._id;
    }

    const attempts = await QuizAttempt.find(query).sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, { attempts }, 'Quiz attempts retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuiz,
  getQuizById,
  startQuiz,
  updateQuiz,
  submitQuiz,
  getQuizAttempts
};
