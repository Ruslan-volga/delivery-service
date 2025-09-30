module.exports = {
  port: process.env.HTTP_PORT || 3000,
  host: process.env.HTTP_HOST || '0.0.0.0',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
};