const express = require('express');
const AdvertisementModule = require('../modules/advertisements/advertisement.module');

const router = express.Router();

// Получить все объявления
router.get('/', async (req, res) => {
  try {
    console.log('Get advertisements request');
    const advertisements = await AdvertisementModule.find(req.query);
    
    const responseData = advertisements.map(ad => ({
      id: ad._id,
      shortTitle: ad.shortText,
      description: ad.description,
      images: ad.images || [],
      user: {
        id: ad.userId?._id || 'unknown',
        name: ad.userId?.name || 'Unknown User'
      },
      createdAt: ad.createdAt
    }));

    res.json({
      data: responseData,
      status: 'ok'
    });
  } catch (error) {
    console.error('Get advertisements error:', error);
    res.status(500).json({
      error: 'Ошибка при получении объявлений: ' + error.message,
      status: 'error'
    });
  }
});

module.exports = router;