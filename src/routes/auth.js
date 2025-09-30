const express = require('express');
const passport = require('passport');
const { successResponse, errorResponse } = require('../middleware/responseHandler');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Регистрация пользователя
router.post('/signup', async (req, res) => {
  try {
    const User = require('../modules/users/user.model');
    const bcrypt = require('bcryptjs');
    const authConfig = require('../config/auth.config');
    
    const { email, password, name, contactPhone } = req.body;
    
    if (!email || !password || !name) {
      return errorResponse(res, 'Email, password и name обязательны', 400);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'Email занят', 400);
    }

    const passwordHash = await bcrypt.hash(password, authConfig.bcrypt.saltRounds);
    const user = new User({
      email,
      passwordHash,
      name,
      contactPhone
    });

    await user.save();

    // Автоматический логин после регистрации
    req.login(user, (err) => {
      if (err) {
        return errorResponse(res, 'Ошибка аутентификации', 500);
      }

      successResponse(res, {
        id: user._id,
        email: user.email,
        name: user.name,
        contactPhone: user.contactPhone
      });
    });
  } catch (error) {
    console.error('Signup error:', error);
    errorResponse(res, 'Ошибка при регистрации: ' + error.message);
  }
});

// Аутентификация
router.post('/signin', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return errorResponse(res, 'Внутренняя ошибка сервера', 500);
    }
    if (!user) {
      return errorResponse(res, info?.message || 'Неверный логин или пароль', 401);
    }

    req.login(user, (err) => {
      if (err) {
        return errorResponse(res, 'Ошибка аутентификации', 500);
      }

      successResponse(res, {
        id: user._id,
        email: user.email,
        name: user.name,
        contactPhone: user.contactPhone
      });
    });
  })(req, res, next);
});

// Выход
router.post('/signout', ensureAuthenticated, (req, res) => {
  req.logout((err) => {
    if (err) {
      return errorResponse(res, 'Ошибка при выходе', 500);
    }
    successResponse(res, { message: 'Выход выполнен успешно' });
  });
});

// Получить текущего пользователя
router.get('/user', ensureAuthenticated, (req, res) => {
  successResponse(res, {
    id: req.user._id,
    email: req.user.email,
    name: req.user.name,
    contactPhone: req.user.contactPhone
  });
});

module.exports = router;