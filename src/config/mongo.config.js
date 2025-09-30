module.exports = {
  url: process.env.MONGO_URL || 'mongodb://mongo:27017/delivery_service',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
};