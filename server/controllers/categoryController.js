const TrainingCategory = require('../models/TrainingCategory');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc    Create a new Training Category
 * @route   POST /api/categories
 * @access  Private (Organization Admin)
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      throw new ApiError(400, 'Category name is required');
    }

    const existingCategory = await TrainingCategory.findOne({
      name: name.trim(),
      organizationId: req.user.organizationId
    });

    if (existingCategory) {
      throw new ApiError(400, 'Training category with this name already exists in your organization');
    }

    const category = await TrainingCategory.create({
      name: name.trim(),
      description,
      organizationId: req.user.organizationId
    });

    res.status(201).json(new ApiResponse(201, { category }, 'Training category created successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all Training Categories
 * @route   GET /api/categories
 * @access  Private (Admin, Instructor, Employee)
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await TrainingCategory.find({
      organizationId: req.user.organizationId,
      status: 'active'
    }).sort({ name: 1 });

    res.status(200).json(new ApiResponse(200, { categories }, 'Training categories retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Training Category
 * @route   PUT /api/categories/:id
 * @access  Private (Organization Admin)
 */
const updateCategory = async (req, res, next) => {
  try {
    const { name, description, status } = req.body;

    const category = await TrainingCategory.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!category) {
      throw new ApiError(404, 'Training category not found');
    }

    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description;
    if (status) category.status = status;

    await category.save();

    res.status(200).json(new ApiResponse(200, { category }, 'Training category updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete/Deactivate Training Category
 * @route   DELETE /api/categories/:id
 * @access  Private (Organization Admin)
 */
const deleteCategory = async (req, res, next) => {
  try {
    const category = await TrainingCategory.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!category) {
      throw new ApiError(404, 'Training category not found');
    }

    category.status = 'deactivated';
    await category.save();

    res.status(200).json(new ApiResponse(200, {}, 'Training category deactivated successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory
};
