const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const User = require('../models/User');
const logger = require('../config/logger');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function signAccessToken(user) {
  const payload = {
    sub: user.id,
    role: user.role,
    name: user.name
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: ACCESS_TOKEN_TTL
  });
}

async function registerUser({ email, password, name, phoneNumber, role = 'rider' }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash, name, phoneNumber, role });
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user);

  return { user, accessToken, refreshToken };
}

async function validateUserCredentials({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new Error('Invalid credentials');
  }

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user);

  return { user, accessToken, refreshToken };
}

async function issueRefreshToken(user) {
  const token = uuid();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  user.refreshTokens.push({ token, expiresAt });
  await user.save();
  return token;
}

async function refreshAccessToken({ refreshToken }) {
  const user = await User.findOne({ 'refreshTokens.token': refreshToken });
  if (!user) {
    throw new Error('Invalid refresh token');
  }

  const storedToken = user.refreshTokens.find((entry) => entry.token === refreshToken);
  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw new Error('Refresh token expired');
  }

  const accessToken = signAccessToken(user);
  return { accessToken };
}

async function revokeRefreshToken({ refreshToken }) {
  const user = await User.findOne({ 'refreshTokens.token': refreshToken });
  if (!user) {
    return;
  }

  user.refreshTokens = user.refreshTokens.filter((entry) => entry.token !== refreshToken);
  await user.save();
  logger.info('Refresh token revoked', { userId: user.id });
}

module.exports = {
  registerUser,
  validateUserCredentials,
  refreshAccessToken,
  revokeRefreshToken
};
