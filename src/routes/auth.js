const express = require('express');
const passport = require('passport');
const UserModule = require('../modules/users/user.module');

const router = express.Router();

// Регистрация - упрощенная версия
router.post('/signup', async (req, res) => {
  try {
    console.log('Signup request:', req.body);
    
    const { email, password, name, contactPhone } = req.body;

    // Проверка обязательных полей
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Email, password и name обязательны',
        status: 'error'
      });
    }

    const existingUser = await UserModule.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'Email занят',
        status: 'error'
      });
    }

    const user = await UserModule.create({
      email,
      password,
      name,
      contactPhone
    });

    res.json({
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        contactPhone: user.contactPhone
      },
      status: 'ok'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: error.message || 'Ошибка при регистрации',
      status: 'error'
    });
  }
});

// Аутентификация - упрощенная версия
router.post('/signin', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        status: 'error'
      });
    }
    if (!user) {
      return res.status(401).json({
        error: info?.message || 'Неверный логин или пароль',
        status: 'error'
      });
    }

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({
          error: 'Ошибка аутентификации',
          status: 'error'
        });
      }

      res.json({
        data: {
          id: user._id,
          email: user.email,
          name: user.name,
          contactPhone: user.contactPhone
        },
        status: 'ok'
      });
    });
  })(req, res, next);
});

module.exports = router;