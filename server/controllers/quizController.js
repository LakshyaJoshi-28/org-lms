const { prisma, withId } = require('../config/prismaClient');
const { updateOverallProgress } = require('../services/progressService');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * Helper to fetch a populated quiz record matching Mongoose structure
 */
const getPopulatedQuiz = async (quizId) => {
  const qId = String(quizId);
  const quiz = await prisma.quiz.findUnique({
    where: { id: qId },
    include: {
      questions: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!quiz) return null;
  return withId(quiz);
};

/**
 * Helper to fetch a populated quiz attempt record matching Mongoose structure
 */
const getPopulatedQuizAttempt = async (attemptId) => {
  const aId = String(attemptId);
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: aId },
    include: {
      answers: {
        orderBy: { questionIndex: 'asc' }
      }
    }
  });

  if (!attempt) return null;
  return withId(attempt);
};

/**
 * @desc    Create Quiz for a SubSection
 * @route   POST /api/quizzes
 * @access  Private (Instructor, Admin)
 */
const createQuiz = async (req, res, next) => {
  try {
    const { title, trainingId, sectionId, subSectionId, questions, timeLimitMinutes, passingScorePercent } = req.body;
    const orgId = String(req.user.organizationId.id || req.user.organizationId._id || req.user.organizationId);
    const instructorId = String(req.user.id || req.user._id);

    if (!title || !trainingId || !questions || !questions.length) {
      throw new ApiError(400, 'Please provide title, trainingId, and questions');
    }

    const trgId = String(trainingId);
    const training = await prisma.training.findFirst({
      where: { id: trgId, organizationId: orgId }
    });
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }

    if (req.user.role === 'Instructor' && training.createdBy !== instructorId) {
      throw new ApiError(403, 'Not authorized to add quiz to this training');
    }

    let targetSubSectionId = subSectionId ? String(subSectionId) : null;
    if (!targetSubSectionId && sectionId) {
      const secId = String(sectionId);
      const firstSub = await prisma.trainingSubSection.findFirst({
        where: { sectionId: secId },
        orderBy: { order: 'asc' }
      });
      if (firstSub) {
        targetSubSectionId = firstSub.id;
      }
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: title.trim(),
        trainingId: training.id,
        subSectionId: targetSubSectionId || training.id,
        timeLimitMinutes: Number(timeLimitMinutes) || 15,
        passingScorePercent: Number(passingScorePercent) || 70,
        createdBy: instructorId,
        organizationId: orgId,
        questions: {
          create: questions.map(q => ({
            questionText: q.questionText,
            options: Array.isArray(q.options) ? q.options : [],
            correctAnswerIndex: Number(q.correctAnswerIndex) || 0,
            score: Number(q.score) || 1
          }))
        }
      }
    });

    if (targetSubSectionId) {
      await prisma.trainingSubSection.update({
        where: { id: targetSubSectionId },
        data: {
          hasQuiz: true,
          quizId: quiz.id
        }
      });
    }

    const populatedQuiz = await getPopulatedQuiz(quiz.id);

    res.status(201).json(new ApiResponse(201, { quiz: populatedQuiz }, 'Quiz created successfully'));
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
    const orgId = String(req.user.organizationId.id || req.user.organizationId._id || req.user.organizationId);
    const paramId = String(req.params.id);

    let quiz = await prisma.quiz.findFirst({
      where: { id: paramId, organizationId: orgId },
      include: { questions: { orderBy: { createdAt: 'asc' } } }
    });

    if (!quiz) {
      quiz = await prisma.quiz.findFirst({
        where: { subSectionId: paramId, organizationId: orgId },
        include: { questions: { orderBy: { createdAt: 'asc' } } }
      });
    }
    if (!quiz) {
      quiz = await prisma.quiz.findFirst({
        where: { trainingId: paramId, organizationId: orgId },
        include: { questions: { orderBy: { createdAt: 'asc' } } }
      });
    }

    if (!quiz) {
      throw new ApiError(404, 'Quiz not found');
    }

    const quizObj = withId(quiz);

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
    const orgId = String(req.user.organizationId.id || req.user.organizationId._id || req.user.organizationId);
    const userId = String(req.user.id || req.user._id);
    const paramId = String(req.params.id);

    let quiz = await prisma.quiz.findFirst({
      where: { id: paramId, organizationId: orgId }
    });
    if (!quiz) {
      quiz = await prisma.quiz.findFirst({
        where: { subSectionId: paramId, organizationId: orgId }
      });
    }
    if (!quiz) {
      quiz = await prisma.quiz.findFirst({
        where: { trainingId: paramId, organizationId: orgId }
      });
    }

    if (!quiz) {
      throw new ApiError(404, 'Quiz not found');
    }

    // Search for active in_progress attempt
    let attempt = await prisma.quizAttempt.findFirst({
      where: {
        quizId: quiz.id,
        employeeId: userId,
        status: 'in_progress'
      },
      include: { answers: true }
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
            attempt: withId(attempt),
            startTime: attempt.startTime,
            timeLimitMinutes: quiz.timeLimitMinutes,
            remainingSeconds
          },
          'Quiz attempt in progress'
        )
      );
    }

    // Create new in_progress attempt
    const previousAttemptsCount = await prisma.quizAttempt.count({
      where: {
        quizId: quiz.id,
        employeeId: userId,
        status: 'completed'
      }
    });

    attempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        trainingAssignmentId: trainingAssignmentId ? String(trainingAssignmentId) : null,
        employeeId: userId,
        status: 'in_progress',
        startTime: new Date(now),
        attemptNumber: previousAttemptsCount + 1
      },
      include: { answers: true }
    });

    res.status(201).json(
      new ApiResponse(
        201,
        {
          attempt: withId(attempt),
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
    const orgId = String(req.user.organizationId.id || req.user.organizationId._id || req.user.organizationId);
    const userId = String(req.user.id || req.user._id);
    const qId = String(req.params.id);

    const quiz = await prisma.quiz.findFirst({
      where: { id: qId, organizationId: orgId }
    });
    if (!quiz) {
      throw new ApiError(404, 'Quiz not found');
    }

    if (req.user.role === 'Instructor' && quiz.createdBy !== userId) {
      throw new ApiError(403, 'Not authorized to update this quiz');
    }

    const { title, questions, timeLimitMinutes, passingScorePercent } = req.body;

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (timeLimitMinutes) updateData.timeLimitMinutes = Number(timeLimitMinutes);
    if (passingScorePercent) updateData.passingScorePercent = Number(passingScorePercent);

    await prisma.quiz.update({
      where: { id: quiz.id },
      data: updateData
    });

    if (questions && Array.isArray(questions)) {
      await prisma.quizQuestion.deleteMany({
        where: { quizId: quiz.id }
      });

      await prisma.quizQuestion.createMany({
        data: questions.map(q => ({
          quizId: quiz.id,
          questionText: q.questionText,
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswerIndex: Number(q.correctAnswerIndex) || 0,
          score: Number(q.score) || 1
        }))
      });
    }

    const updatedQuiz = await getPopulatedQuiz(quiz.id);

    res.status(200).json(new ApiResponse(200, { quiz: updatedQuiz }, 'Quiz updated successfully'));
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
    const { userAnswers, trainingAssignmentId, attemptId } = req.body;
    const orgId = String(req.user.organizationId.id || req.user.organizationId._id || req.user.organizationId);
    const userId = String(req.user.id || req.user._id);
    const paramId = String(req.params.id);

    if (!userAnswers || !Array.isArray(userAnswers)) {
      throw new ApiError(400, 'Please provide userAnswers array');
    }

    let quiz = await prisma.quiz.findFirst({
      where: { id: paramId, organizationId: orgId },
      include: { questions: { orderBy: { createdAt: 'asc' } } }
    });
    if (!quiz) {
      quiz = await prisma.quiz.findFirst({
        where: { subSectionId: paramId, organizationId: orgId },
        include: { questions: { orderBy: { createdAt: 'asc' } } }
      });
    }
    if (!quiz) {
      quiz = await prisma.quiz.findFirst({
        where: { trainingId: paramId, organizationId: orgId },
        include: { questions: { orderBy: { createdAt: 'asc' } } }
      });
    }

    if (!quiz) {
      throw new ApiError(404, 'Quiz not found');
    }

    // Check for existing attempt
    let attempt;
    if (attemptId) {
      attempt = await prisma.quizAttempt.findFirst({
        where: { id: String(attemptId), employeeId: userId },
        include: { answers: true }
      });
    }
    if (!attempt) {
      attempt = await prisma.quizAttempt.findFirst({
        where: {
          quizId: quiz.id,
          employeeId: userId,
          status: 'in_progress'
        },
        include: { answers: true }
      });
    }

    // Idempotency check: if attempt is already completed, return existing result without error
    if (attempt && attempt.status === 'completed') {
      const populatedAttempt = await getPopulatedQuizAttempt(attempt.id);
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            attempt: populatedAttempt,
            passingScorePercent: quiz.passingScorePercent,
            percentage: attempt.percentage,
            passed: attempt.passed,
            evaluatedAnswers: populatedAttempt.answers
          },
          attempt.passed ? 'Congratulations! You passed the quiz.' : `Quiz failed (${attempt.percentage}%). Required score: ${quiz.passingScorePercent}%.`
        )
      );
    }

    let totalScore = 0;
    let maxScore = 0;
    const evaluatedAnswersData = [];

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

      evaluatedAnswersData.push({
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
      await prisma.quizAttemptAnswer.deleteMany({
        where: { quizAttemptId: attempt.id }
      });

      attempt = await prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'completed',
          endTime: new Date(),
          submittedAt: new Date(),
          totalScore,
          maxScore,
          percentage,
          passed,
          answers: {
            create: evaluatedAnswersData
          }
        }
      });
    } else {
      const previousAttemptsCount = await prisma.quizAttempt.count({
        where: {
          quizId: quiz.id,
          employeeId: userId,
          status: 'completed'
        }
      });

      attempt = await prisma.quizAttempt.create({
        data: {
          quizId: quiz.id,
          trainingAssignmentId: trainingAssignmentId ? String(trainingAssignmentId) : null,
          employeeId: userId,
          status: 'completed',
          startTime: new Date(),
          endTime: new Date(),
          submittedAt: new Date(),
          totalScore,
          maxScore,
          percentage,
          passed,
          attemptNumber: previousAttemptsCount + 1,
          answers: {
            create: evaluatedAnswersData
          }
        }
      });
    }

    let targetAssignmentId = trainingAssignmentId ? String(trainingAssignmentId) : null;
    if (!targetAssignmentId && quiz.trainingId) {
      const foundTa = await prisma.trainingAssignment.findFirst({
        where: { trainingId: quiz.trainingId, employeeId: userId }
      });
      if (foundTa) targetAssignmentId = foundTa.id;
    }

    if (targetAssignmentId && passed) {
      await updateOverallProgress(targetAssignmentId, userId);
    }

    // Send quiz result notification to employee
    const { sendUserNotification } = require('../services/notificationService');
    if (passed) {
      await sendUserNotification(
        userId,
        orgId,
        'Employee',
        'QUIZ_PASSED',
        'Quiz Passed',
        `Congratulations! You passed the quiz for ${quiz.title} with a score of ${percentage}%.`,
        { entityType: 'Quiz', entityId: quiz.id }
      );
    } else {
      await sendUserNotification(
        userId,
        orgId,
        'Employee',
        'QUIZ_FAILED',
        'Quiz Failed',
        `You did not pass the quiz for ${quiz.title}. Score: ${percentage}%.`,
        { entityType: 'Quiz', entityId: quiz.id }
      );
    }

    const populatedAttempt = await getPopulatedQuizAttempt(attempt.id);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          attempt: populatedAttempt,
          passingScorePercent: quiz.passingScorePercent,
          percentage,
          passed,
          evaluatedAnswers: populatedAttempt.answers
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
    const orgId = String(req.user.organizationId.id || req.user.organizationId._id || req.user.organizationId);
    const userId = String(req.user.id || req.user._id);
    const paramId = String(req.params.id);

    let quiz = await prisma.quiz.findFirst({
      where: { id: paramId, organizationId: orgId }
    });
    if (!quiz) {
      quiz = await prisma.quiz.findFirst({
        where: { subSectionId: paramId, organizationId: orgId }
      });
    }

    const quizId = quiz ? quiz.id : paramId;

    const whereClause = { quizId };
    if (req.user.role === 'Employee') {
      whereClause.employeeId = userId;
    }

    const attemptsList = await prisma.quizAttempt.findMany({
      where: whereClause,
      select: { id: true },
      orderBy: { createdAt: 'desc' }
    });

    const attempts = await Promise.all(attemptsList.map(a => getPopulatedQuizAttempt(a.id)));

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
