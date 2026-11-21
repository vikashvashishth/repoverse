const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function tokenFor(user) { return jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }); }
function userPayload(user) { return { id: user._id, fullName: user.fullName, email: user.email, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt }; }
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

async function signup(req, res, next) {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName?.trim() || !email?.trim() || !password) return res.status(400).json({ message: 'Full name, email, and password are required.' });
    if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (await User.exists({ email: email.toLowerCase().trim() })) return res.status(409).json({ message: 'An account already exists for this email.' });
    const user = await User.create({ fullName: fullName.trim(), email: email.toLowerCase().trim(), password: await bcrypt.hash(password, 12), lastLoginAt: new Date() });
    res.status(201).json({ token: tokenFor(user), user: userPayload(user) });
  } catch (error) { next(error); }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    user.lastLoginAt = new Date(); await user.save();
    res.json({ token: tokenFor(user), user: userPayload(user) });
  } catch (error) { next(error); }
}

function me(req, res) { res.json({ user: userPayload(req.user) }); }
module.exports = { signup, login, me };
