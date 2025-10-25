const { EventEmitter } = require('events');

const rideEvents = new EventEmitter();
rideEvents.setMaxListeners(100);

module.exports = rideEvents;
