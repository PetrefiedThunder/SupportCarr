function serializeRide(ride) {
  if (!ride) {
    return null;
  }

  let data;
  if (typeof ride.toObject === 'function') {
    data = ride.toObject({ getters: true, virtuals: true });
  } else if (typeof ride.toJSON === 'function') {
    data = ride.toJSON();
  } else {
    data = JSON.parse(JSON.stringify(ride));
  }

  if (!data.id && ride.id) {
    data.id = ride.id;
  }

  if (!data._id && ride._id) {
    data._id = ride._id;
  }

  if (data._id && !data.id) {
    data.id = data._id.toString();
  }

  return data;
}

module.exports = serializeRide;
