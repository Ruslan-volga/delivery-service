const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
  shortText: { type: String, required: true },
  description: { type: String },
  images: [{ type: String }],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: String }],
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Advertisement', advertisementSchema);