const { generateId, matches } = require('./utils');

function matchesFilter(doc, filter = {}) {
  if (filter.$or) {
    return filter.$or.some((clause) => matchesFilter(doc, clause));
  }
  return matches(doc, filter);
}

class PaymentLedgerDocument {
  constructor(doc) {
    Object.assign(this, doc);
    this._id = doc._id || generateId();
  }

  get id() {
    return this._id;
  }

  async save() {
    const existingIndex = store.findIndex((doc) => String(doc._id) === String(this._id));
    if (existingIndex >= 0) {
      store[existingIndex] = this;
    } else {
      store.push(this);
    }
    return this;
  }
}

const store = [];

class PaymentLedgerModel {
  static async create(doc) {
    const record = new PaymentLedgerDocument(doc);
    store.push(record);
    return record;
  }

  static findOne(query = {}) {
    const doc = store.find((record) => matchesFilter(record, query)) || null;
    return {
      then(resolve, reject) {
        try {
          resolve(doc);
        } catch (error) {
          reject(error);
        }
      }
    };
  }

  static async findOneAndUpdate(filter, update = {}, options = {}) {
    let doc = store.find((record) => matchesFilter(record, filter));

    if (!doc && options.upsert) {
      doc = new PaymentLedgerDocument({
        ...(update.$setOnInsert || {}),
        ...(update.$set || {})
      });
      store.push(doc);
      return doc;
    }

    if (doc && update.$set) {
      Object.assign(doc, update.$set);
    }

    return doc || null;
  }

  static async deleteMany() {
    store.length = 0;
  }

  static reset() {
    store.length = 0;
  }
}

PaymentLedgerModel.__store = store;
PaymentLedgerModel.__reset = PaymentLedgerModel.reset;

module.exports = PaymentLedgerModel;
