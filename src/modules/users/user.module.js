const bcrypt = require('bcryptjs');
const User = require('./user.model');

class UserModule {
  static async create(userData) {
    try {
      const { password, ...rest } = userData;
      const passwordHash = await bcrypt.hash(password, 10);
      
      const user = new User({
        ...rest,
        passwordHash
      });
      
      return await user.save();
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    return await User.findOne({ email });
  }

  static async findById(id) {
    return await User.findById(id);
  }

  static async validatePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
}

module.exports = UserModule;