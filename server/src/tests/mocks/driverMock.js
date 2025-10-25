const { generateId, matches } = require('./utils');
const User = require('./userMock');

class DriverDocument {
  constructor(doc) {
    Object.assign(this, doc);
    this._id = doc._id || generateId();
    this.active = doc.active ?? false;
    this.currentLocation = doc.currentLocation || null;
  }

  get id() {
    return this._id;
  }

  async save() {
    return this;
  }

  populate(field) {
    if (field === 'user') {
      const user = User.__store.find((u) => String(u._id) === String(this.user));
      this.user = user || this.user;
    }
    return Promise.resolve(this);
  }
}

const store = [];

class DriverQuery {
  constructor(doc) {
    this.doc = doc;
  }

  async populate(field) {
    if (this.doc && typeof this.doc.populate === 'function') {
      await this.doc.populate(field);
    }
    return this;
  }

  then(resolve, reject) {
    return Promise.resolve(this.doc).then(resolve, reject);
  }
}

class DriverModel {
  static async create(doc) {
    const record = new DriverDocument(doc);
    store.push(record);
    return record;
  }

  static async findOneAndUpdate(filter, update, options = {}) {
    let doc = store.find((item) => matches(item, filter));
    if (!doc && options.upsert) {
      doc = new DriverDocument({ ...filter, ...update });
      store.push(doc);
    } else if (doc) {
      Object.assign(doc, update);
    }
    return options.new === false ? null : doc;
  }

  static findById(id) {
    const doc = store.find((item) => String(item._id) === String(id)) || null;
    return new DriverQuery(doc);
  }

  static reset() {
    store.length = 0;
  }
}

module.exports = DriverModel;
module.exports.__store = store;
module.exports.__reset = DriverModel.reset;
