const authService = require('../services/authService');

async function register(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await authService.registerUser(req.body);
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        phoneNumber: user.phoneNumber
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await authService.validateUserCredentials(req.body);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        phoneNumber: user.phoneNumber
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const { accessToken } = await authService.refreshAccessToken({ refreshToken: req.body.refreshToken });
    res.json({ accessToken });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    await authService.revokeRefreshToken({ refreshToken: req.body.refreshToken });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout
};
