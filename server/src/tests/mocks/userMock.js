const { generateId, matches } = require('./utils');

class UserDocument {
  constructor(doc) {
    Object.assign(this, doc);
    this._id = doc._id || generateId();
    this.refreshTokens = doc.refreshTokens || [];
  }

  get id() {
    return this._id;
  }

  async save() {
    return this;
  }
}

const store = [];

class UserModel {
  static async create(doc) {
    const record = new UserDocument(doc);
    store.push(record);
    return record;
  }

  static async findOne(query) {
    return store.find((doc) => matches(doc, query)) || null;
  }

  static async findById(id) {
    return store.find((doc) => String(doc._id) === String(id)) || null;
  }

  static reset() {
    store.length = 0;
  }
}

module.exports = UserModel;
module.exports.__store = store;
module.exports.__reset = UserModel.reset;
