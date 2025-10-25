const User = require('./userMock');
const Driver = require('./driverMock');
const Ride = require('./rideMock');

function resetAll() {
  User.__reset();
  Driver.__reset();
  Ride.__reset();
}

module.exports = {
  User,
  Driver,
  Ride,
  resetAll
};
