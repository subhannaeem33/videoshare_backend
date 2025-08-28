const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, unique: true, required: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['CONSUMER', 'CREATOR', 'ADMIN'],
      default: 'CONSUMER'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
