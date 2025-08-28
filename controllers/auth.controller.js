const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(user) {
  const payload = { sub: user._id.toString(), role: user.role };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'email and password required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already in use' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash, role: 'CONSUMER' });

    const token = signToken(user);
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name } });
  } catch (e) {
    next(e);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name } });
  } catch (e) {
    next(e);
  }
};

exports.me = async (req, res) => {
  res.json({ user: req.user });
};

