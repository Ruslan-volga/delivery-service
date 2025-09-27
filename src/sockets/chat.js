const Chat = require('../modules/chat/chat.model');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Получить историю чата
    socket.on('getHistory', async (data) => {
      try {
        const { receiverId } = data;
        const authorId = socket.userId; // Будет установлено при аутентификации

        if (!authorId || !receiverId) {
          socket.emit('error', { message: 'Не указаны ID пользователей' });
          return;
        }

        const chat = await Chat.findOne({
          users: { $all: [authorId, receiverId] }
        }).populate('messages.author', 'name')
          .populate('users', 'name');

        if (chat) {
          socket.emit('chatHistory', {
            chatId: chat._id,
            messages: chat.messages,
            users: chat.users
          });
        } else {
          socket.emit('chatHistory', {
            chatId: null,
            messages: [],
            users: []
          });
        }
      } catch (error) {
        console.error('Error getting chat history:', error);
        socket.emit('error', { message: 'Ошибка получения истории' });
      }
    });

    // Отправить сообщение
    socket.on('sendMessage', async (data) => {
      try {
        const { receiverId, text } = data;
        const authorId = socket.userId;

        if (!authorId || !receiverId || !text) {
          socket.emit('error', { message: 'Не указаны обязательные параметры' });
          return;
        }

        // Находим или создаем чат
        let chat = await Chat.findOne({
          users: { $all: [authorId, receiverId], $size: 2 }
        });

        if (!chat) {
          chat = new Chat({
            users: [authorId, receiverId],
            messages: []
          });
        }

        // Добавляем сообщение
        const message = {
          author: authorId,
          text: text,
          sentAt: new Date()
        };

        chat.messages.push(message);
        await chat.save();

        // Популируем данные для отправки
        await chat.populate('messages.author', 'name');
        await chat.populate('users', 'name');

        const newMessage = chat.messages[chat.messages.length - 1];

        // Отправляем сообщение обоим пользователям
        io.emit('newMessage', {
          chatId: chat._id,
          message: newMessage,
          chatUsers: chat.users
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Ошибка отправки сообщения' });
      }
    });

    // Аутентификация через socket
    socket.on('authenticate', (data) => {
      const { userId } = data;
      if (userId) {
        socket.userId = userId;
        console.log(`User ${userId} authenticated on socket ${socket.id}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};