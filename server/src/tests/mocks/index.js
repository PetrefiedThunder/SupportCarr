const User = require('./userMock');
const Driver = require('./driverMock');
const Ride = require('./rideMock');
const PaymentLedger = require('./paymentLedgerMock');

function resetAll() {
  User.__reset();
  Driver.__reset();
  Ride.__reset();
  PaymentLedger.__reset();
}

module.exports = {
  User,
  Driver,
  Ride,
  PaymentLedger,
  resetAll
};
