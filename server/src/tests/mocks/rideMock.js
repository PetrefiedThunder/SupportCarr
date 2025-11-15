const { generateId, matches } = require('./utils');
const Driver = require('./driverMock');
const User = require('./userMock');

class RideDocument {
  constructor(doc) {
    Object.assign(this, doc);
    this._id = doc._id || generateId();
    this.createdAt = doc.createdAt || new Date();
    // Store original references before population
    this._originalRefs = {
      rider: doc.rider,
      driver: doc.driver
    };
  }

  get id() {
    return this._id;
  }

  async save() {
    // Check if this document is already in the store
    const existingIndex = store.findIndex((doc) => String(doc._id) === String(this._id));
    if (existingIndex >= 0) {
      // Update existing document in store
      store[existingIndex] = this;
    } else {
      // Add new document to store
      store.push(this);
    }
    return this;
  }

  async populate(pathOrOptions) {
    const path = typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path;
    const nestedPopulate = typeof pathOrOptions === 'object' ? pathOrOptions.populate : null;

    if (path === 'driver') {
      const driver = await Driver.findById(this.driver);
      if (driver && nestedPopulate) {
        await driver.populate(nestedPopulate);
      }
      this.driver = driver;
    } else if (path === 'rider') {
      const rider = await User.findById(this.rider);
      this.rider = rider;
    }
    return this;
  }
}

const store = [];

class RideQuery {
  constructor(doc) {
    this.doc = doc;
    this.populatePaths = [];
  }

  populate(pathOrOptions) {
    this.populatePaths.push(pathOrOptions);
    return this;
  }

  async then(resolve, reject) {
    try {
      if (this.doc && typeof this.doc.populate === 'function') {
        for (const pathOrOptions of this.populatePaths) {
          await this.doc.populate(pathOrOptions);
        }
      }
      resolve(this.doc);
    } catch (error) {
      reject(error);
    }
  }
}

class RideModel {
  static async create(doc) {
    const record = new RideDocument(doc);
    store.push(record);
    return record;
  }

  static findById(id) {
    const doc = store.find((record) => String(record._id) === String(id)) || null;
    return new RideQuery(doc);
  }

  static find(query = {}) {
    const results = store.filter((doc) => matches(doc, query));
    return {
      sort(sortOptions) {
        // Sort the results if sortOptions provided
        if (sortOptions) {
          const sortKey = Object.keys(sortOptions)[0];
          const sortOrder = sortOptions[sortKey];
          results.sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (sortOrder === -1) {
              return bVal > aVal ? 1 : -1;
            } else {
              return aVal > bVal ? 1 : -1;
            }
          });
        }
        return Promise.resolve(results.slice());
      }
    };
  }

  static findOne(query = {}) {
    const results = store.filter((doc) => matches(doc, query));
    return {
      sort(sortOptions) {
        // Simple sort by createdAt descending if sortOptions includes createdAt: -1
        if (sortOptions && sortOptions.createdAt === -1) {
          results.sort((a, b) => b.createdAt - a.createdAt);
        }
        return this;
      },
      then(resolve, reject) {
        try {
          resolve(results.length > 0 ? results[0] : null);
        } catch (error) {
          reject(error);
        }
      }
    };
  }

  static async insertMany(docs) {
    docs.forEach((doc) => {
      store.push(new RideDocument(doc));
    });
    return docs;
  }

  static async deleteMany() {
    store.length = 0;
  }

  static reset() {
    store.length = 0;
  }
}

module.exports = RideModel;
module.exports.__store = store;
module.exports.__reset = RideModel.reset;
