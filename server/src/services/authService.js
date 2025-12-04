const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const userRepository = require('../db/userRepository');
const logger = require('../config/logger');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function signAccessToken(user) {
  const payload = {
    sub: user.id,
    role: user.role,
    name: user.name
  };

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return jwt.sign(payload, jwtSecret, {
    expiresIn: ACCESS_TOKEN_TTL
  });
}

async function registerUser({ email, password, name, phoneNumber, role = 'rider' }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userRepository.createUser({ email, passwordHash, name, phoneNumber, role });
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user);

  return { user, accessToken, refreshToken };
}

async function validateUserCredentials({ email, password }) {
  const user = await userRepository.findByEmail(email);
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

  const updated = await userRepository.appendRefreshToken(user.id, { token, expiresAt });
  if (!updated) {
    throw new Error('Failed to persist refresh token');
  }

  return token;
}

async function refreshAccessToken({ refreshToken }) {
  const user = await userRepository.findByRefreshToken(refreshToken);
  if (!user) {
    throw new Error('Invalid refresh token');
  }

  const storedToken = (user.refreshTokens || []).find((entry) => entry.token === refreshToken);
  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw new Error('Refresh token expired');
  }

  const accessToken = signAccessToken(user);
  return { accessToken };
}

async function revokeRefreshToken({ refreshToken }) {
  const user = await userRepository.removeRefreshToken(refreshToken);
  if (!user) return;
  logger.info('Refresh token revoked', { userId: user.id });
}

module.exports = {
  registerUser,
  validateUserCredentials,
  refreshAccessToken,
  revokeRefreshToken
};
