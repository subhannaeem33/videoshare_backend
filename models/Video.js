const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stars: { type: Number, min: 1, max: 5, required: true }
  },
  { _id: false, timestamps: true }
);

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    publisher: { type: String },
    producer: { type: String },
    genre: { type: String },
    ageRating: { type: String }, // e.g., PG, 18
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    blobName: { type: String, required: true, unique: true },
    url: { type: String }, // public URL after finalize
    status: { type: String, enum: ['uploading', 'ready'], default: 'uploading' },

    ratings: [ratingSchema],
    averageRating: { type: Number, default: 0 },
    posterUrl: { type: String },
  },
  { timestamps: true }
);

videoSchema.index({ title: 'text', genre: 'text', publisher: 'text', producer: 'text' });

module.exports = mongoose.model('Video', videoSchema);
