const Video = require('../models/Video');
const Comment = require('../models/Comment');
const User = require('../models/User');

const { createUploadSasUrl, publicBlobUrl, newBlobName } = require('../config/azure');

exports.promote = async (req, res, next) => {
  try {
    const { role } = req.body || {};
    if (!['CONSUMER', 'CREATOR', 'ADMIN'].includes(role))
      return res.status(400).json({ message: 'Invalid role' });

    const user = await User.findByIdAndUpdate(req.params.userId, { role }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ id: user._id, email: user.email, role: user.role });
  } catch (e) {
    next(e);
  }
};

exports.listUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, 'name email role createdAt').sort({ createdAt: -1 });
    res.json(users);
  } catch (e) {
    next(e);
  }
};

exports.listVideosWithStats = async (req, res, next) => {
  try {
    const videos = await Video.find({})
      .select('title creator averageRating createdAt')
      .populate('creator', 'name email')
      .lean();

    // Add total comments count per video
    const videoIds = videos.map(v => v._id);
    const commentsCounts = await Comment.aggregate([
      { $match: { video: { $in: videoIds } } },
      { $group: { _id: '$video', count: { $sum: 1 } } }
    ]);

    const countsMap = {};
    commentsCounts.forEach(c => {
      countsMap[c._id.toString()] = c.count;
    });

    const videosWithStats = videos.map(video => ({
      ...video,
      totalComments: countsMap[video._id.toString()] || 0,
    }));

    res.json(videosWithStats);
  } catch (e) {
    next(e);
  }
};


exports.getUserCount = async (req, res) => {
  const count = await User.countDocuments()
  res.json({ count })
}

exports.getVideoCount = async (req, res) => {
  const count = await Video.countDocuments()
  res.json({ count })
}