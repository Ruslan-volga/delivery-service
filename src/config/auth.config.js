module.exports = {
  session: {
    secret: process.env.SESSION_SECRET || 'delivery-service-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    }
  },
  bcrypt: {
    saltRounds: 10
  }
};