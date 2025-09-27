const EventEmitter = require('events');
const Chat = require('./chat.model');

class ChatModule extends EventEmitter {
  static async find(users) {
    return await Chat.findOne({
      users: { $all: users, $size: users.length }
    }).populate('users', 'name email')
      .populate('messages.author', 'name');
  }

  static async sendMessage(data) {
    const { author, receiver, text } = data;
    const users = [author, receiver].sort();

    let chat = await Chat.findOne({ users });

    if (!chat) {
      chat = new Chat({ users, messages: [] });
    }

    const message = {
      author,
      text,
      readAt: null
    };

    chat.messages.push(message);
    await chat.save();

    await chat.populate('messages.author', 'name');
    
    // Отправка события о новом сообщении
    this.emit('newMessage', {
      chatId: chat._id,
      message: chat.messages[chat.messages.length - 1]
    });

    return message;
  }

  static async getHistory(chatId) {
    const chat = await Chat.findById(chatId)
      .populate('messages.author', 'name');
    return chat ? chat.messages : [];
  }

  static subscribe(callback) {
    this.on('newMessage', callback);
  }
}

module.exports = new ChatModule();