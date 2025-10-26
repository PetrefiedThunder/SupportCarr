jest.mock('mongoose', () => {
  const connection = { readyState: 0 };
  return {
    connect: jest.fn().mockResolvedValue(),
    disconnect: jest.fn().mockResolvedValue(),
    set: jest.fn(),
    connection
  };
});

const mongoose = require('mongoose');

const originalMongoUri = process.env.MONGODB_URI;
const originalLegacyUri = process.env.MONGO_URI;

jest.unmock('../../../config/database');

describe('connectDatabase', () => {
  beforeEach(() => {
    delete process.env.MONGODB_URI;
    delete process.env.MONGO_URI;
    mongoose.connection.readyState = 0;
    mongoose.connect.mockClear();
  });

  afterAll(() => {
    if (originalMongoUri === undefined) {
      delete process.env.MONGODB_URI;
    } else {
      process.env.MONGODB_URI = originalMongoUri;
    }

    if (originalLegacyUri === undefined) {
      delete process.env.MONGO_URI;
    } else {
      process.env.MONGO_URI = originalLegacyUri;
    }
  });

  it('uses MONGODB_URI when provided', async () => {
    const mockedUri = 'mongodb://example.test/supportcarr';
    process.env.MONGODB_URI = mockedUri;
    const { connectDatabase } = require('../../../config/database');

    mongoose.connection.readyState = 0;
    expect(mongoose.connection.readyState).toBe(0);
    await connectDatabase();

    expect(mongoose.connect).toHaveBeenCalledWith(mockedUri, { autoIndex: true });
  });
});
