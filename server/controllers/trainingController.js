const mongoose = require('mongoose');
const Training = require('../models/Training');
const TrainingCategory = require('../models/TrainingCategory');
const Department = require('../models/Department');
const Quiz = require('../models/Quiz');
const Assignment = require('../models/Assignment');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc    Save/Update Full Course Structure (Sections, Lectures, Quiz, Assignment, Resources, Draft/Published Status)
 * @route   POST /api/trainings/save-full-course
 * @access  Private (Instructor owner, Admin)
 */
const saveFullCourse = async (req, res, next) => {
  try {
    const {
      trainingId,
      title,
      description,
      categoryId,
      thumbnailUrl,
      thumbnailPublicId,
      benefits,
      durationDays,
      status, // 'draft' | 'published'
      sections, // Array of sections with lectures, quiz
      assignment, // Optional assignment { title, instructions }
      resources // Optional PDF resources [{ title, fileUrl, filePublicId }]
    } = req.body;

    if (!title || !categoryId) {
      throw new ApiError(400, 'Training title and category are required');
    }

    const isPublished = status === 'published';
    const isMandatory = req.user.role === 'Admin' ? Boolean(req.body.isMandatory) : false;
    const orgId = req.user.organizationId;
    const instructorId = req.user._id;

    let training;

    if (trainingId) {
      training = await Training.findOne({ _id: trainingId, organizationId: orgId });
      if (!training) throw new ApiError(404, 'Training not found');
      if (req.user.role === 'Instructor' && training.createdBy.toString() !== instructorId.toString()) {
        throw new ApiError(403, 'Not authorized to update this training');
      }

      training.title = title;
      training.description = description || title;
      training.categoryId = categoryId;
      if (thumbnailUrl !== undefined) training.thumbnailUrl = thumbnailUrl;
      if (thumbnailPublicId !== undefined) training.thumbnailPublicId = thumbnailPublicId;
      training.benefits = benefits || [];
      training.durationDays = Number(durationDays) || 30;
      training.status = status || 'draft';
      training.isPublished = isPublished;
      if (req.user.role === 'Admin' && isMandatory !== undefined) training.isMandatory = isMandatory;
    } else {
      training = new Training({
        title,
        description: description || title,
        categoryId,
        createdBy: instructorId,
        organizationId: orgId,
        thumbnailUrl: thumbnailUrl || '',
        thumbnailPublicId: thumbnailPublicId || '',
        benefits: benefits || [],
        durationDays: Number(durationDays) || 30,
        status: status || 'draft',
        isPublished,
        isMandatory,
        sections: []
      });
    }

    // Process Sections & SubSections (Lectures)
    const formattedSections = [];

    if (sections && Array.isArray(sections)) {
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        const secId = new mongoose.Types.ObjectId();
        const subSections = [];

        const lecturesList = sec.lectures && sec.lectures.length > 0 ? sec.lectures : [{ title: `${sec.title} Lecture 1`, description: sec.description || '' }];

        for (let j = 0; j < lecturesList.length; j++) {
          const lec = lecturesList[j];
          const subSecId = new mongoose.Types.ObjectId();

          let quizId = null;
          let hasQuiz = false;

          // If a quiz is linked to this section
          if (sec.quiz && sec.quiz.questions && sec.quiz.questions.length > 0 && j === 0) {
            const newQuiz = await Quiz.create({
              title: sec.quiz.title || `${sec.title} Quiz`,
              trainingId: training._id,
              subSectionId: subSecId,
              questions: sec.quiz.questions.map(q => ({
                questionText: q.questionText,
                options: q.options || [],
                correctAnswerIndex: Number(q.correctAnswerIndex) || 0,
                score: 1
              })),
              timeLimitMinutes: Number(sec.quiz.timeLimitMinutes) || 15,
              passingScorePercent: Number(sec.quiz.passingScorePercent) || 70,
              createdBy: instructorId,
              organizationId: orgId
            });
            quizId = newQuiz._id;
            hasQuiz = true;
          }

          subSections.push({
            _id: subSecId,
            title: lec.title || `Lecture ${j + 1}`,
            description: lec.description || '',
            order: j + 1,
            videoUrl: lec.videoUrl || '',
            videoPublicId: lec.videoPublicId || '',
            videoDuration: Number(lec.videoDuration) || 0,
            pdfResources: resources && resources.length > 0 && j === 0 ? resources.map(r => ({
              title: r.title || r.name || 'Resource PDF',
              fileUrl: r.fileUrl || r.url || '',
              filePublicId: r.filePublicId || ''
            })) : [],
            hasQuiz,
            quizId,
            hasAssignment: false,
            assignmentId: null
          });
        }

        formattedSections.push({
          _id: secId,
          title: sec.title || `Section ${i + 1}`,
          description: sec.description || '',
          order: i + 1,
          subSections
        });
      }
    }

    // Process Assignment (if provided) — attach to the LAST subsection of the LAST section
    if (assignment && assignment.instructions) {
      let lastSubSec = null;
      for (let i = formattedSections.length - 1; i >= 0; i--) {
        const s = formattedSections[i];
        if (s.subSections && s.subSections.length > 0) {
          lastSubSec = s.subSections[s.subSections.length - 1];
          break;
        }
      }

      if (lastSubSec) {
        const newAssignment = await Assignment.create({
          title: assignment.title || `${title} Assignment`,
          instructions: assignment.instructions,
          trainingId: training._id,
          subSectionId: lastSubSec._id,
          maxScore: 100,
          createdBy: instructorId,
          organizationId: orgId
        });

        lastSubSec.hasAssignment = true;
        lastSubSec.assignmentId = newAssignment._id;
      }
    }

    training.sections = formattedSections;
    await training.save();

    const populatedTraining = await Training.findById(training._id)
      .populate('categoryId', 'name')
      .populate('departmentId', 'name')
      .populate('createdBy', 'name email')
      .populate({
        path: 'sections.subSections.quizId',
        model: 'Quiz'
      })
      .populate({
        path: 'sections.subSections.assignmentId',
        model: 'Assignment'
      });

    res.status(200).json(
      new ApiResponse(200, { training: populatedTraining }, `Training ${trainingId ? 'updated' : 'created'} successfully as ${training.status}`)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new Training
 * @route   POST /api/trainings
 * @access  Private (Instructor, Admin)
 */
const createTraining = async (req, res, next) => {
  try {
    const { title, description, categoryId, departmentId, durationDays, isMandatory, thumbnailUrl, thumbnailPublicId, benefits } = req.body;

    if (!title || !description || !categoryId) {
      throw new ApiError(400, 'Please provide title, description, and categoryId');
    }

    const category = await TrainingCategory.findOne({ _id: categoryId, organizationId: req.user.organizationId });
    if (!category) {
      throw new ApiError(404, 'Training category not found');
    }

    if (departmentId) {
      const department = await Department.findOne({ _id: departmentId, organizationId: req.user.organizationId });
      if (!department) {
        throw new ApiError(404, 'Department not found');
      }
    }

    const training = await Training.create({
      title,
      description,
      benefits: benefits || [],
      categoryId,
      departmentId: departmentId || null,
      createdBy: req.user._id,
      organizationId: req.user.organizationId,
      durationDays: Number(durationDays) || 30,
      isMandatory: req.user.role === 'Admin' ? Boolean(isMandatory) : false,
      thumbnailUrl,
      thumbnailPublicId,
      sections: []
    });

    const populatedTraining = await Training.findById(training._id)
      .populate('categoryId', 'name')
      .populate('departmentId', 'name')
      .populate('createdBy', 'name email');

    res.status(201).json(new ApiResponse(201, { training: populatedTraining }, 'Training created successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Trainings (Admin = all org, Instructor = owned, Employee = published)
 * @route   GET /api/trainings
 * @access  Private
 */
const getTrainings = async (req, res, next) => {
  try {
    let query = { organizationId: req.user.organizationId, status: { $ne: 'archived' } };

    if (req.user.role === 'Instructor') {
      query.createdBy = req.user._id;
    } else if (req.user.role === 'Employee') {
      query.isPublished = true;
    }

    const trainings = await Training.find(query)
      .populate('categoryId', 'name')
      .populate('departmentId', 'name')
      .populate('createdBy', 'name email')
      .populate({
        path: 'sections.subSections.quizId',
        model: 'Quiz'
      })
      .populate({
        path: 'sections.subSections.assignmentId',
        model: 'Assignment'
      })
      .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, { trainings }, 'Trainings retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Training Details by ID
 * @route   GET /api/trainings/:id
 * @access  Private
 */
const getTrainingById = async (req, res, next) => {
  try {
    const training = await Training.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    })
      .populate('categoryId', 'name')
      .populate('departmentId', 'name jobRoles')
      .populate('createdBy', 'name email')
      .populate({
        path: 'sections.subSections.quizId',
        model: 'Quiz'
      })
      .populate({
        path: 'sections.subSections.assignmentId',
        model: 'Assignment'
      });

    if (!training) {
      throw new ApiError(404, 'Training not found');
    }

    // Permission check for instructors
    if (req.user.role === 'Instructor' && training.createdBy._id.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You do not have permission to access this training');
    }

    res.status(200).json(new ApiResponse(200, { training }, 'Training details retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Basic Training Details
 * @route   PUT /api/trainings/:id
 * @access  Private (Instructor owner, Admin)
 */
const updateTraining = async (req, res, next) => {
  try {
    const training = await Training.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!training) {
      throw new ApiError(404, 'Training not found');
    }

    if (req.user.role === 'Instructor' && training.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You are not authorized to update this training');
    }

    const { title, description, benefits, categoryId, departmentId, durationDays, isMandatory, isPublished, status, thumbnailUrl, thumbnailPublicId } = req.body;

    if (title) training.title = title;
    if (description) training.description = description;
    if (benefits) training.benefits = benefits;
    if (categoryId) training.categoryId = categoryId;
    if (departmentId !== undefined) training.departmentId = departmentId || null;
    if (durationDays) training.durationDays = Number(durationDays);
    if (thumbnailUrl !== undefined) training.thumbnailUrl = thumbnailUrl;
    if (thumbnailPublicId !== undefined) training.thumbnailPublicId = thumbnailPublicId;
    if (req.user.role === 'Admin' && isMandatory !== undefined) training.isMandatory = Boolean(isMandatory);
    if (isPublished !== undefined) {
      training.isPublished = Boolean(isPublished);
      training.status = training.isPublished ? 'published' : 'draft';
    }
    if (status) training.status = status;

    await training.save();

    const updatedTraining = await Training.findById(training._id)
      .populate('categoryId', 'name')
      .populate('departmentId', 'name')
      .populate('createdBy', 'name email');

    res.status(200).json(new ApiResponse(200, { training: updatedTraining }, 'Training updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete/Archive Training
 * @route   DELETE /api/trainings/:id
 * @access  Private (Instructor owner, Admin)
 */
const deleteTraining = async (req, res, next) => {
  try {
    const training = await Training.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!training) {
      throw new ApiError(404, 'Training not found');
    }

    if (req.user.role === 'Instructor' && training.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You are not authorized to delete this training');
    }

    training.status = 'archived';
    training.isPublished = false;
    await training.save();

    res.status(200).json(new ApiResponse(200, {}, 'Training archived successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add Section to Training
 * @route   POST /api/trainings/:id/sections
 * @access  Private (Instructor owner, Admin)
 */
const addSection = async (req, res, next) => {
  try {
    const { title, description, order } = req.body;
    if (!title) throw new ApiError(400, 'Section title is required');

    const training = await Training.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!training) throw new ApiError(404, 'Training not found');

    if (req.user.role === 'Instructor' && training.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized');
    }

    training.sections.push({
      title,
      description: description || '',
      order: order || training.sections.length + 1,
      subSections: []
    });

    await training.save();

    res.status(201).json(new ApiResponse(201, { training }, 'Section added successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Section
 * @route   PUT /api/trainings/:id/sections/:sectionId
 * @access  Private (Instructor owner, Admin)
 */
const updateSection = async (req, res, next) => {
  try {
    const { title, description, order } = req.body;
    const training = await Training.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!training) throw new ApiError(404, 'Training not found');

    if (req.user.role === 'Instructor' && training.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized');
    }

    const section = training.sections.id(req.params.sectionId);
    if (!section) throw new ApiError(404, 'Section not found');

    if (title) section.title = title;
    if (description !== undefined) section.description = description;
    if (order !== undefined) section.order = order;

    await training.save();

    res.status(200).json(new ApiResponse(200, { training }, 'Section updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete Section
 * @route   DELETE /api/trainings/:id/sections/:sectionId
 * @access  Private (Instructor owner, Admin)
 */
const deleteSection = async (req, res, next) => {
  try {
    const training = await Training.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!training) throw new ApiError(404, 'Training not found');

    if (req.user.role === 'Instructor' && training.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized');
    }

    training.sections.pull({ _id: req.params.sectionId });
    await training.save();

    res.status(200).json(new ApiResponse(200, { training }, 'Section deleted successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add SubSection to Section
 * @route   POST /api/trainings/:id/sections/:sectionId/subsections
 * @access  Private (Instructor owner, Admin)
 */
const addSubSection = async (req, res, next) => {
  try {
    const { title, description, order, videoUrl, videoPublicId, videoDuration } = req.body;
    if (!title) throw new ApiError(400, 'SubSection title is required');

    const training = await Training.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!training) throw new ApiError(404, 'Training not found');

    if (req.user.role === 'Instructor' && training.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized');
    }

    const section = training.sections.id(req.params.sectionId);
    if (!section) throw new ApiError(404, 'Section not found');

    section.subSections.push({
      title,
      description,
      order: order || section.subSections.length + 1,
      videoUrl: videoUrl || '',
      videoPublicId: videoPublicId || '',
      videoDuration: videoDuration || 0,
      pdfResources: [],
      hasQuiz: false,
      hasAssignment: false
    });

    await training.save();

    res.status(201).json(new ApiResponse(201, { training }, 'Sub-section added successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update SubSection
 * @route   PUT /api/trainings/:id/sections/:sectionId/subsections/:subSectionId
 * @access  Private (Instructor owner, Admin)
 */
const updateSubSection = async (req, res, next) => {
  try {
    const { title, description, order, videoUrl, videoPublicId, videoDuration, pdfResources, hasQuiz, quizId, hasAssignment, assignmentId } = req.body;
    const training = await Training.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!training) throw new ApiError(404, 'Training not found');

    if (req.user.role === 'Instructor' && training.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized');
    }

    const section = training.sections.id(req.params.sectionId);
    if (!section) throw new ApiError(404, 'Section not found');

    const subSection = section.subSections.id(req.params.subSectionId);
    if (!subSection) throw new ApiError(404, 'Sub-section not found');

    if (title) subSection.title = title;
    if (description !== undefined) subSection.description = description;
    if (order !== undefined) subSection.order = order;
    if (videoUrl !== undefined) subSection.videoUrl = videoUrl;
    if (videoPublicId !== undefined) subSection.videoPublicId = videoPublicId;
    if (videoDuration !== undefined) subSection.videoDuration = videoDuration;
    if (pdfResources !== undefined) subSection.pdfResources = pdfResources;
    if (hasQuiz !== undefined) subSection.hasQuiz = hasQuiz;
    if (quizId !== undefined) subSection.quizId = quizId;
    if (hasAssignment !== undefined) subSection.hasAssignment = hasAssignment;
    if (assignmentId !== undefined) subSection.assignmentId = assignmentId;

    await training.save();

    res.status(200).json(new ApiResponse(200, { training }, 'Sub-section updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete SubSection
 * @route   DELETE /api/trainings/:id/sections/:sectionId/subsections/:subSectionId
 * @access  Private (Instructor owner, Admin)
 */
const deleteSubSection = async (req, res, next) => {
  try {
    const training = await Training.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!training) throw new ApiError(404, 'Training not found');

    if (req.user.role === 'Instructor' && training.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized');
    }

    const section = training.sections.id(req.params.sectionId);
    if (!section) throw new ApiError(404, 'Section not found');

    section.subSections.pull({ _id: req.params.subSectionId });
    await training.save();

    res.status(200).json(new ApiResponse(200, { training }, 'Sub-section deleted successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  saveFullCourse,
  createTraining,
  getTrainings,
  getTrainingById,
  updateTraining,
  deleteTraining,
  addSection,
  updateSection,
  deleteSection,
  addSubSection,
  updateSubSection,
  deleteSubSection
};
