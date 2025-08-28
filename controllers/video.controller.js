const Video = require('../models/Video');
const { createUploadSasUrl, publicBlobUrl, newBlobName } = require('../config/azure');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { BlobSASPermissions, StorageSharedKeyCredential, generateBlobSASQueryParameters } = require('@azure/storage-blob');

exports.requestUpload = async (req, res, next) => {
  try {
    const { title, publisher, producer, genre, ageRating, ext } = req.body || {};
    if (!title) return res.status(400).json({ message: 'title is required' });

    const blobName = newBlobName(ext || 'mp4');
    const sasUrl = createUploadSasUrl(blobName, 20);

    const video = await Video.create({
      title, publisher, producer, genre, ageRating,
      creator: req.user.id,
      blobName,
      status: 'uploading'
    });

    res.json({
      videoId: video._id,
      uploadUrl: sasUrl,
      blobName
    });
  } catch (e) {
    next(e);
  }
};

exports.finalizeUpload = async (req, res, next) => {
  try {
    const { videoId } = req.body || {};
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    if (video.creator.toString() !== req.user.id && req.user.role !== 'ADMIN')
      return res.status(403).json({ message: 'Forbidden' });

    video.url = publicBlobUrl(video.blobName);
    video.status = 'ready';
    await video.save();

    res.json({ id: video._id, url: video.url, status: video.status });
  } catch (e) {
    next(e);
  }
};

exports.latest = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const docs = await Video.find({ status: 'ready' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('title url genre ageRating averageRating posterUrl createdAt');
    res.json(docs);
  } catch (e) {
    next(e);
  }
};

exports.search = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const docs = await Video.find(
      { $text: { $search: q }, status: 'ready' },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(30)
      .select('title url genre ageRating averageRating createdAt');
    res.json(docs);
  } catch (e) {
    next(e);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('creator', 'name email')
      .lean();
    if (!video) return res.status(404).json({ message: 'Not found' });
    res.json(video);
  } catch (e) {
    next(e);
  }
};

exports.rate = async (req, res, next) => {
  try {
    const { stars } = req.body || {};
    const s = Number(stars);
    if (!(s >= 1 && s <= 5)) return res.status(400).json({ message: 'stars must be 1–5' });

    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Not found' });

    const idx = video.ratings.findIndex(r => r.user.toString() === req.user.id);
    if (idx >= 0) {
      video.ratings[idx].stars = s;
    } else {
      video.ratings.push({ user: req.user.id, stars: s });
    }
    const avg =
      video.ratings.reduce((sum, r) => sum + r.stars, 0) / (video.ratings.length || 1);
    video.averageRating = Math.round(avg * 10) / 10;
    await video.save();

    res.json({ averageRating: video.averageRating, count: video.ratings.length });
  } catch (e) {
    next(e);
  }
};

exports.listByCreator = async (req, res, next) => {
  try {
    const { creatorId } = req.params;
    if (req.user.role !== 'ADMIN' && req.user.id !== creatorId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const videos = await Video.find({ creator: creatorId }).sort({ createdAt: -1 }).lean();
    res.json(videos);
  } catch (e) {
    next(e);
  }
};

exports.updateMeta = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, genre, ageRating } = req.body;
    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    if (req.user.role !== 'ADMIN' && video.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (title) video.title = title;
    if (genre) video.genre = genre;
    if (ageRating) video.ageRating = ageRating;

    await video.save();
    res.json(video);
  } catch (e) {
    next(e);
  }
};


const upload = multer({ dest: 'uploads/', limits: { fileSize: 2 * 1024 * 1024 } }); // limit 2MB

exports.uploadPoster = [
  upload.single('poster'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const video = await Video.findById(id);
      if (!video) return res.status(404).json({ message: 'Video not found' });

      if (req.user.role !== 'ADMIN' && video.creator.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const file = req.file;
      if (!file) return res.status(400).json({ message: 'No file uploaded.' });

      const targetDir = path.join(__dirname, '..', 'static', 'posters');
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      const newFileName = `${id}_${Date.now()}${path.extname(file.originalname)}`;
      const destPath = path.join(targetDir, newFileName);

      fs.renameSync(file.path, destPath);

      video.posterUrl = `/static/posters/${newFileName}`;
      await video.save();

      res.json({ url: video.posterUrl });
    } catch (e) {
      next(e);
    }
  }
];


function getAzureCreds() {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT;
  const accountKey = process.env.AZURE_STORAGE_KEY;
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  return { accountName, credential };
}

function createPosterUploadSasUrl(blobName, expiresMinutes = 15) {
  const { accountName, credential } = getAzureCreds();
  const container = 'posters';
  const sas = generateBlobSASQueryParameters(
    {
      containerName: container,
      blobName,
      permissions: BlobSASPermissions.parse('cw'),
      startsOn: new Date(),
      expiresOn: new Date(Date.now() + expiresMinutes * 60 * 1000)
    },
    credential
  ).toString();
  return `https://${accountName}.blob.core.windows.net/${container}/${blobName}?${sas}`;
}

exports.getPosterSasUrl = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ext = req.body.ext ? req.body.ext.replace(/[^a-zA-Z0-9.]/g, '') : 'png';
    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    if (req.user.role !== 'ADMIN' && video.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const blobName = `${id}_${uuidv4()}.${ext}`;
    const uploadUrl = createPosterUploadSasUrl(blobName, 20); // Expires in 20 min
    const publicUrl = `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/posters/${blobName}`;
    res.json({ uploadUrl, publicUrl, blobName });
  } catch (e) {
    next(e);
  }
};

exports.setPosterUrl = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { posterUrl } = req.body;
    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    if (req.user.role !== 'ADMIN' && video.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    video.posterUrl = posterUrl;
    await video.save();
    res.json({ posterUrl });
  } catch (e) {
    next(e);
  }
};
