const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const videoRoutes = require('./routes/video.routes');
const commentRoutes = require('./routes/comment.routes');
const healthRoutes = require('./routes/health.routes');
const adminRoutes = require('./routes/admin.routes');
const { notFound, errorHandler } = require('./middleware/error');
const path = require('path');

const app = express();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/static', cors({ origin: 'http://localhost:3000' }));

app.use('/static/posters', express.static(path.join(__dirname, 'static', 'posters')));

// light rate limit for auth & comments
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/auth', authLimiter);

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/videos', videoRoutes);
app.use('/comments', commentRoutes);
app.use('/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
