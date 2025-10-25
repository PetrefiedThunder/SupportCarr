const { generateId, matches } = require('./utils');
const Driver = require('./driverMock');

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

  async populate({ path, populate }) {
    if (path === 'driver') {
      const driver = await Driver.findById(this.driver);
      if (driver && populate) {
        await driver.populate(populate);
      }
      this.driver = driver;
    }
    return this;
  }
}

const store = [];

class RideQuery {
  constructor(doc) {
    this.doc = doc;
  }

  async populate(options) {
    if (this.doc && typeof this.doc.populate === 'function') {
      await this.doc.populate(options);
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
