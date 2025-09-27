require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Настройка CORS для Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Импорт конфигурации passport
require('./config/passport');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Сессии
app.use(session({
  secret: process.env.SESSION_SECRET || 'delivery-service-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Статическая раздача файлов
app.use('/uploads', express.static('uploads'));

// Middleware для передачи io в запросы
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Импорт middleware аутентификации
const { ensureAuthenticated } = require('./middleware/auth');

// ========== МАРШРУТЫ API ==========

// Корневой маршрут
app.get('/', (req, res) => {
  res.json({ 
    message: 'Delivery Service API is working!',
    status: 'ok',
    user: req.user ? { id: req.user._id, name: req.user.name } : null
  });
});

// WebSocket endpoint для тестирования
app.get('/ws', (req, res) => {
  res.json({ message: 'WebSocket server is running' });
});

// Регистрация пользователя
app.post('/api/signup', async (req, res) => {
  try {
    const User = require('./modules/users/user.model');
    const bcrypt = require('bcryptjs');
    
    const { email, password, name, contactPhone } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Email, password и name обязательны',
        status: 'error'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: 'Email занят',
        status: 'error'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
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
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: 'Ошибка при регистрации: ' + error.message,
      status: 'error'
    });
  }
});

// Аутентификация
app.post('/api/signin', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({
        error: info?.message || 'Неверный логин или пароль',
        status: 'error'
      });
    }

    req.login(user, (err) => {
      if (err) {
        return next(err);
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

// Выход
app.post('/api/signout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        error: 'Ошибка при выходе',
        status: 'error'
      });
    }
    res.json({ status: 'ok' });
  });
});

// Получить текущего пользователя
app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      data: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        contactPhone: req.user.contactPhone
      },
      status: 'ok'
    });
  } else {
    res.status(401).json({
      error: 'Не аутентифицирован',
      status: 'error'
    });
  }
});

// Получить все объявления с фильтрацией
app.get('/api/advertisements', async (req, res) => {
  try {
    const Advertisement = require('./modules/advertisements/advertisement.model');
    
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

    res.json({
      data: responseData,
      status: 'ok'
    });
  } catch (error) {
    console.error('Error getting advertisements:', error);
    res.status(500).json({
      error: 'Ошибка при получении объявлений: ' + error.message,
      status: 'error'
    });
  }
});

// Получить конкретное объявление по ID
app.get('/api/advertisements/:id', async (req, res) => {
  try {
    const Advertisement = require('./modules/advertisements/advertisement.model');
    const advertisement = await Advertisement.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    }).populate('userId', 'name email');

    if (!advertisement) {
      return res.status(404).json({
        error: 'Объявление не найдено',
        status: 'error'
      });
    }

    res.json({
      data: {
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
      },
      status: 'ok'
    });
  } catch (error) {
    console.error('Error getting advertisement:', error);
    res.status(500).json({
      error: 'Ошибка при получении объявления',
      status: 'error'
    });
  }
});

// Создание объявления
app.post('/api/advertisements', ensureAuthenticated, async (req, res) => {
  try {
    const Advertisement = require('./modules/advertisements/advertisement.model');
    const upload = require('./middleware/upload');
    
    upload.array('images', 5)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          error: 'Ошибка загрузки файлов: ' + err.message,
          status: 'error'
        });
      }

      try {
        const { shortTitle, description, tags } = req.body;
        
        if (!shortTitle) {
          return res.status(400).json({
            error: 'shortTitle обязателен',
            status: 'error'
          });
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

        res.status(201).json({
          data: {
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
          },
          status: 'ok'
        });
      } catch (error) {
        console.error('Create advertisement error:', error);
        res.status(500).json({
          error: 'Ошибка при создании объявления: ' + error.message,
          status: 'error'
        });
      }
    });
  } catch (error) {
    console.error('Create advertisement error:', error);
    res.status(500).json({
      error: 'Ошибка при создании объявления: ' + error.message,
      status: 'error'
    });
  }
});

// Удаление объявления с проверкой прав
app.delete('/api/advertisements/:id', ensureAuthenticated, async (req, res) => {
  try {
    const Advertisement = require('./modules/advertisements/advertisement.model');
    
    const advertisement = await Advertisement.findById(req.params.id);
    if (!advertisement) {
      return res.status(404).json({
        error: 'Объявление не найдено',
        status: 'error'
      });
    }

    // Проверка владельца
    if (advertisement.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Недостаточно прав для удаления',
        status: 'error'
      });
    }

    advertisement.isDeleted = true;
    await advertisement.save();

    res.json({
      message: 'Объявление успешно удалено',
      status: 'ok'
    });
  } catch (error) {
    console.error('Delete advertisement error:', error);
    res.status(500).json({
      error: 'Ошибка при удалении объявления: ' + error.message,
      status: 'error'
    });
  }
});

// ========== WEB SOCKET ОБРАБОТЧИК ==========

// Простой WebSocket обработчик для тестирования
io.on('connection', (socket) => {
  console.log('✅ Новый клиент подключен:', socket.id);

  // Тестовое сообщение при подключении
  socket.emit('message', { 
    type: 'connected', 
    message: 'Добро пожаловать в чат!',
    socketId: socket.id 
  });

  // Обработка аутентификации
  socket.on('authenticate', (data) => {
    console.log('Аутентификация:', data);
    socket.userId = data.userId;
    socket.emit('message', { 
      type: 'authenticated', 
      userId: data.userId,
      message: 'Аутентификация успешна' 
    });
  });

  // Эхо-тест
  socket.on('ping', (data) => {
    socket.emit('pong', { 
      type: 'pong', 
      message: 'Hello from server!', 
      originalData: data,
      timestamp: new Date().toISOString()
    });
  });

  // Простой чат
  socket.on('chat message', (data) => {
    console.log('Сообщение от клиента:', data);
    // Отправляем сообщение всем подключенным клиентам
    io.emit('chat message', {
      type: 'chat',
      from: socket.userId || 'anonymous',
      message: data.message,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log('❌ Клиент отключен:', socket.id);
  });
});

console.log('✅ WebSocket server initialized');

// Подключение к MongoDB
mongoose.connect(process.env.MONGO_URL || 'mongodb://mongo:27017/delivery_service', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected successfully');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});

// Запуск сервера
const PORT = process.env.HTTP_PORT || 3000;
const HOST = process.env.HTTP_HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`✅ Server running on http://${HOST}:${PORT}`);
  console.log(`✅ WebSocket server running on ws://${HOST}:${PORT}`);
});