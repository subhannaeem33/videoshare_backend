const Comment = require('../models/Comment');

exports.add = async (req, res, next) => {
  try {
    const { text } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ message: 'text required' });

    const doc = await Comment.create({
      video: req.params.videoId,
      user: req.user.id,
      text: text.trim()
    });

    res.json({ id: doc._id, text: doc.text, createdAt: doc.createdAt });
  } catch (e) {
    next(e);
  }
};

exports.list = async (req, res, next) => {
  try {
    const docs = await Comment.find({ video: req.params.videoId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('user', 'name');
    res.json(docs);
  } catch (e) {
    next(e);
  }
};
