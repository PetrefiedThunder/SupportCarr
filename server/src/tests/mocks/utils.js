const { v4: uuid } = require('uuid');

function generateId() {
  return uuid().replace(/-/g, '').slice(0, 24);
}

function matches(doc, query = {}) {
  return Object.entries(query).every(([key, value]) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (value.$in) {
        return value.$in.includes(doc[key]);
      }
    }
    if (key.includes('.')) {
      const [first, rest] = key.split(/\.(.+)/);
      const target = doc[first];
      if (Array.isArray(target)) {
        return target.some((item) => matches(item || {}, { [rest]: value }));
      }
      return matches(target || {}, { [rest]: value });
    }
    if (typeof value === 'object' && value !== null && value.$in) {
      return value.$in.includes(doc[key]);
    }
    // Handle case where doc[key] is an object with _id property (populated field)
    const docValue = doc[key];
    if (typeof docValue === 'object' && docValue !== null && docValue._id) {
      return String(docValue._id) === String(value);
    }
    return String(docValue) === String(value);
  });
}

module.exports = {
  generateId,
  matches
};
