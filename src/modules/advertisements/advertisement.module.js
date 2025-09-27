const Advertisement = require('./advertisement.model');

class AdvertisementModule {
  static async find(params = {}) {
    try {
      const { shortText, description, userId, tags } = params;
      const query = { isDeleted: false };

      if (shortText) {
        query.shortText = { $regex: shortText, $options: 'i' };
      }

      if (description) {
        query.description = { $regex: description, $options: 'i' };
      }

      if (userId) {
        query.userId = userId;
      }

      if (tags) {
        query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
      }

      const advertisements = await Advertisement.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 });

      return advertisements;
    } catch (error) {
      console.error('Error finding advertisements:', error);
      throw error;
    }
  }

  static async create(advertisementData) {
    try {
      const advertisement = new Advertisement(advertisementData);
      return await advertisement.save();
    } catch (error) {
      console.error('Error creating advertisement:', error);
      throw error;
    }
  }

  static async remove(id) {
    try {
      return await Advertisement.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      );
    } catch (error) {
      console.error('Error removing advertisement:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      return await Advertisement.findOne({ _id: id, isDeleted: false })
        .populate('userId', 'name email');
    } catch (error) {
      console.error('Error finding advertisement by id:', error);
      throw error;
    }
  }
}

module.exports = AdvertisementModule;