const { generateId, matches } = require('./utils');
const Driver = require('./driverMock');
const User = require('./userMock');

class RideDocument {
  constructor(doc) {
    Object.assign(this, doc);
    this._id = doc._id || generateId();
    this.createdAt = doc.createdAt || new Date();
  }

  get id() {
    return this._id;
  }

  async save() {
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
  }

  populate(pathOrOptions) {
    if (this.doc && typeof this.doc.populate === 'function') {
      this.doc.populate(pathOrOptions);
    }
    return this;
  }

  then(resolve, reject) {
    return Promise.resolve(this.doc).then(resolve, reject);
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
      sort() {
        return Promise.resolve(results.slice());
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
