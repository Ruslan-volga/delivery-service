const express = require('express');
const { successResponse, errorResponse } = require('../middleware/responseHandler');
const { ensureAuthenticated } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Получить все объявления с фильтрацией
router.get('/', async (req, res) => {
  try {
    const Advertisement = require('../modules/advertisements/advertisement.model');
    
    const { shortText, description, tags, userId } = req.query;
    const query = { isDeleted: false };

    if (shortText) {
      query.shortText = { $regex: shortText, $options: 'i' };
    }

    if (description) {
      query.description = { $regex: description, $options: 'i' };
    }

    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : tags.split(',');
      query.tags = { $in: tagsArray };
    }

    if (userId) {
      query.userId = userId;
    }

    const advertisements = await Advertisement.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    const responseData = advertisements.map(ad => ({
      id: ad._id,
      shortTitle: ad.shortText,
      description: ad.description,
      images: ad.images || [],
      tags: ad.tags || [],
      user: {
        id: ad.userId?._id,
        name: ad.userId?.name,
        email: ad.userId?.email
      },
      createdAt: ad.createdAt
    }));

    successResponse(res, responseData);
  } catch (error) {
    console.error('Error getting advertisements:', error);
    errorResponse(res, 'Ошибка при получении объявлений: ' + error.message);
  }
});

// Получить конкретное объявление по ID
router.get('/:id', async (req, res) => {
  try {
    const Advertisement = require('../modules/advertisements/advertisement.model');
    const advertisement = await Advertisement.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    }).populate('userId', 'name email');

    if (!advertisement) {
      return errorResponse(res, 'Объявление не найдено', 404);
    }

    successResponse(res, {
      id: advertisement._id,
      shortTitle: advertisement.shortText,
      description: advertisement.description,
      images: advertisement.images || [],
      tags: advertisement.tags || [],
      user: {
        id: advertisement.userId._id,
        name: advertisement.userId.name,
        email: advertisement.userId.email
      },
      createdAt: advertisement.createdAt
    });
  } catch (error) {
    console.error('Error getting advertisement:', error);
    errorResponse(res, 'Ошибка при получении объявления');
  }
});

// Создание объявления
router.post('/', ensureAuthenticated, upload, async (req, res) => {
  try {
    const Advertisement = require('../modules/advertisements/advertisement.model');
    
    const { shortTitle, description, tags } = req.body;
    
    if (!shortTitle) {
      return errorResponse(res, 'shortTitle обязателен', 400);
    }

    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const advertisement = new Advertisement({
      shortText: shortTitle,
      description: description || '',
      userId: req.user._id,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
      images: images
    });

    await advertisement.save();
    await advertisement.populate('userId', 'name email');

    successResponse(res, {
      id: advertisement._id,
      shortTitle: advertisement.shortText,
      description: advertisement.description,
      images: advertisement.images,
      tags: advertisement.tags || [],
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email
      },
      createdAt: advertisement.createdAt
    }, 201);
  } catch (error) {
    console.error('Create advertisement error:', error);
    errorResponse(res, 'Ошибка при создании объявления: ' + error.message);
  }
});

// Удаление объявления
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const Advertisement = require('../modules/advertisements/advertisement.model');
    
    const advertisement = await Advertisement.findById(req.params.id);
    if (!advertisement) {
      return errorResponse(res, 'Объявление не найдено', 404);
    }

    // Проверка владельца
    if (advertisement.userId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Недостаточно прав для удаления', 403);
    }

    advertisement.isDeleted = true;
    await advertisement.save();

    successResponse(res, { message: 'Объявление успешно удалено' });
  } catch (error) {
    console.error('Delete advertisement error:', error);
    errorResponse(res, 'Ошибка при удалении объявления: ' + error.message);
  }
});

module.exports = router;