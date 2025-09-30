require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const http = require('http');
const { Server } = require('socket.io');

// Конфигурации
const authConfig = require('./config/auth.config');
const mongoConfig = require('./config/mongo.config');
const serverConfig = require('./config/server.config');

// Импорт конфигурации passport
require('./config/passport');

const app = express();
const server = http.createServer(app);

// Настройка Socket.io
const io = new Server(server, {
  cors: serverConfig.cors
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Сессии
app.use(session(authConfig.session));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Статическая раздача файлов
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api', require('./routes/auth'));
app.use('/api/advertisements', require('./routes/advertisements'));

// Корневой маршрут
app.get('/', (req, res) => {
  const { successResponse } = require('./middleware/responseHandler');
  successResponse(res, {
    message: 'Delivery Service API is working!',
    user: req.user ? { id: req.user._id, name: req.user.name } : null
  });
});

// WebSocket endpoint для тестирования
app.get('/ws', (req, res) => {
  const { successResponse } = require('./middleware/responseHandler');
  successResponse(res, { message: 'WebSocket server is running' });
});

// WebSocket обработчик
io.on('connection', (socket) => {
  console.log('✅ Новый клиент подключен:', socket.id);

  socket.emit('message', { 
    type: 'connected', 
    message: 'Добро пожаловать в чат!',
    socketId: socket.id 
  });

  socket.on('authenticate', (data) => {
    console.log('Аутентификация:', data);
    socket.userId = data.userId;
    socket.emit('message', { 
      type: 'authenticated', 
      userId: data.userId,
      message: 'Аутентификация успешна' 
    });
  });

  socket.on('ping', (data) => {
    socket.emit('pong', { 
      type: 'pong', 
      message: 'Hello from server!', 
      originalData: data,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('chat message', (data) => {
    console.log('Сообщение от клиента:', data);
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
mongoose.connect(mongoConfig.url, mongoConfig.options)
.then(() => {
  console.log('MongoDB connected successfully');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});

// Запуск сервера
server.listen(serverConfig.port, serverConfig.host, () => {
  console.log(`✅ Server running on http://${serverConfig.host}:${serverConfig.port}`);
  console.log(`✅ WebSocket server running on ws://${serverConfig.host}:${serverConfig.port}`);
});