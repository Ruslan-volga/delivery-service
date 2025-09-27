const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000');

ws.on('open', function open() {
  console.log('Connected to WebSocket server');
  
  // Аутентифицируем первого пользователя
  ws.send(JSON.stringify({
    type: 'authenticate',
    userId: '68d8100656f88a7074505f71' // Test User
  }));

  // Ждем немного и отправляем сообщение
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'sendMessage',
      receiverId: '68d825597fc06a4c0796abde', // Test User 2
      text: 'Привет от первого пользователя!'
    }));
  }, 1000);
});

ws.on('message', function message(data) {
  console.log('Received:', data.toString());
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('Disconnected from WebSocket server');
});